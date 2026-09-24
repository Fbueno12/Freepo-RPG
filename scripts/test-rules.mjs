import { readFileSync } from "node:fs";
import { initializeTestEnvironment, assertSucceeds } from "@firebase/rules-unit-testing";

const PROJECT = "demo-freepo";

const env = await initializeTestEnvironment({
  projectId: PROJECT,
  firestore: {
    host: "localhost",
    port: 8080,
    rules: readFileSync("firestore.rules.v2", "utf8"),
  },
});

await env.clearFirestore();

let passed = 0;
let failed = 0;
const failures = [];

async function expect(label, outcome, opPromiseProvider) {
  try {
    await assertSucceeds(opPromiseProvider());
    if (outcome === "allow") {
      passed++;
      console.log(`✓ ${label}`);
    } else {
      failed++;
      failures.push(`${label}: esperado DENY, foi permitido`);
      console.log(`✗ ${label}`);
    }
  } catch (err) {
    const denied = err?.code === "permission-denied";
    if (outcome === "deny" && denied) {
      passed++;
      console.log(`✓ ${label}`);
    } else {
      failed++;
      failures.push(`${label}: esperado ${outcome}, erro=${err?.code ?? err?.message}`);
      console.log(`✗ ${label}  [${err?.code ?? err?.message}]`);
    }
  }
}

const A = env.authenticatedContext("uid-aaaa-0000");
const B = env.authenticatedContext("uid-bbbb-0000");
const C = env.authenticatedContext("uid-cccc-0000");
const fsA = A.firestore();
const fsB = B.firestore();
const fsC = C.firestore();

console.log("\nUIDs: A=uid-aaaa-0000 B=uid-bbbb-0000 C=uid-cccc-0000\n");

// Seed (contorna regras): campanhas + membership
await env.withSecurityRulesDisabled(async (ctx) => {
  const fs = ctx.firestore();
  await fs.collection("campaigns").doc("c1").set({ ownerId: "uid-aaaa-0000", name: "Campanha do A" });
  await fs.collection("campaigns").doc("c2").set({ ownerId: "uid-cccc-0000", name: "Campanha do C" });
  await fs
    .collection("campaignMembers")
    .doc("c1")
    .set({ campaignId: "c1", members: { "uid-aaaa-0000": "gm" }, memberUids: ["uid-aaaa-0000"] });
  await fs
    .collection("campaignMembers")
    .doc("c1")
    .update({ members: { "uid-aaaa-0000": "gm", "uid-bbbb-0000": "pc" }, memberUids: ["uid-aaaa-0000", "uid-bbbb-0000"] });
  await fs.doc("notes/c1").set({ campaignId: "c1", content: "v0", updatedBy: "uid-aaaa-0000" });
  await fs.doc("map/c1").set({ backgroundImage: "", tokens: [] });
  await fs.doc("map/c1/tokens/t-visible").set({
    name: "Herói", icon: "⚔️", type: "pc", x: 10, y: 10,
    visible: true, ownerId: "uid-bbbb-0000",
  });
  await fs.doc("map/c1/tokens/t-hidden").set({
    name: "Chefe", icon: "👹", type: "npc", x: 80, y: 80, visible: false,
  });
  await fs.doc("map/c1/tokens/t-owned-hidden").set({
    name: "Familiar", icon: "🐺", type: "pc", x: 20, y: 20,
    visible: false, ownerId: "uid-bbbb-0000",
  });
});

console.log("== campaigns ==");
await expect("C cria c3 com ownerId forjado", "deny", () =>
  fsC.collection("campaigns").doc("c3").set({ ownerId: "uid-aaaa-0000", name: "X" }),
);
await expect("C lê c1 (isSignedIn)", "allow", () => fsC.doc("campaigns/c1").get());
await expect("B tenta atualizar c1 (não é dono)", "deny", () =>
  fsB.doc("campaigns/c1").update({ name: "Hack" }),
);
await expect("A atualiza nome de c1 (dono)", "allow", () =>
  fsA.doc("campaigns/c1").update({ name: "Renomeada" }),
);

console.log("\n== campaignMembers ==");
await expect("A cria membership de cX como gm", "allow", () =>
  fsA.collection("campaignMembers").doc("cx").set({
    campaignId: "cx",
    members: { "uid-aaaa-0000": "gm" },
    memberUids: ["uid-aaaa-0000"],
  }),
);
await expect("C cria doc inexistente como pc", "deny", () =>
  fsC.collection("campaignMembers").doc("cz").set({
    campaignId: "cz",
    members: { "uid-cccc-0000": "pc" },
    memberUids: ["uid-cccc-0000"],
  }),
);
await expect("C lê c1 (não-membro)", "deny", () => fsC.doc("campaignMembers/c1").get());
await expect("B lista memberships com array-contains B", "allow", () =>
  fsB.collection("campaignMembers").where("memberUids", "array-contains", "uid-bbbb-0000").get(),
);
await expect("C lista memberships com array-contains C (vazio)", "allow", async () => {
  const snap = await fsC
    .collection("campaignMembers")
    .where("memberUids", "array-contains", "uid-cccc-0000")
    .get();
  if (snap.size !== 0) throw new Error(`vazou ${snap.size} doc(s)`);
});

console.log("\n== characters (subcoleção campaigns/{id}/characters) ==");
const chars = (db, id) => db.collection("campaigns/c1/characters").doc(id);
await expect("A cria ficha de A na c1", "allow", () =>
  chars(fsA, "char-a").set({ campaignId: "c1", userId: "uid-aaaa-0000", name: "Ficha A" }),
);
await expect("A cria ficha com userId forjado (B)", "deny", () =>
  chars(fsA, "char-forge").set({ campaignId: "c1", userId: "uid-bbbb-0000", name: "X" }),
);
await expect("B cria ficha de B na c1", "allow", () =>
  chars(fsB, "char-b").set({ campaignId: "c1", userId: "uid-bbbb-0000", name: "Ficha B" }),
);
await expect("B lê ficha de A (get, membro)", "allow", () => chars(fsB, "char-a").get());
await expect("C lê ficha de A (get, não-membro)", "deny", () => chars(fsC, "char-a").get());
await expect("B lista fichas da c1 (membro)", "allow", () =>
  fsB.collection("campaigns/c1/characters").get(),
);
await expect("C lista fichas da c1 (não-membro)", "deny", () =>
  fsC.collection("campaigns/c1/characters").get(),
);
await expect("B atualiza ficha (só campos mutáveis)", "allow", () =>
  chars(fsB, "char-b").update({ name: "Atualizada" }),
);
await expect("B tenta trocar userId (invariante)", "deny", () =>
  chars(fsB, "char-a").update({ userId: "uid-bbbb-0000" }),
);
await expect("B tenta mudar campaignId (invariante)", "deny", () =>
  chars(fsB, "char-a").update({ campaignId: "c2" }),
);

console.log("\n== chats ==");
await expect("B envia mensagem no chat da c1", "allow", () =>
  fsB.collection("chats/c1/messages").add({ userId: "uid-bbbb-0000", text: "oi", createdAt: Date.now() }),
);
await expect("C envia mensagem (não-membro)", "deny", () =>
  fsC.collection("chats/c1/messages").add({ userId: "uid-cccc-0000", text: "intruso", createdAt: Date.now() }),
);
await expect("B lista mensagens da c1", "allow", () =>
  fsB.collection("chats/c1/messages").orderBy("createdAt").get(),
);

console.log("\n== notes ==");
await expect("A atualiza notas da c1 (create já seedado)", "allow", () =>
  fsA.doc("notes/c1").update({ content: "v1", updatedBy: "uid-aaaa-0000" }),
);
await expect("B atualiza notas da c1", "allow", () =>
  fsB.doc("notes/c1").update({ content: "v2", updatedBy: "uid-bbbb-0000" }),
);
await expect("B atualiza com updatedBy forjado", "deny", () =>
  fsB.doc("notes/c1").update({ content: "v3", updatedBy: "uid-aaaa-0000" }),
);
await expect("B tenta mudar campaignId das notas", "deny", () =>
  fsB.doc("notes/c1").update({ campaignId: "c2", content: "v4", updatedBy: "uid-bbbb-0000" }),
);
await expect("B lê notas da c1", "allow", () => fsB.doc("notes/c1").get());
await expect("C cria notas de cX (set completo, fora da campanha)", "deny", () =>
  fsC.doc("notes/cx").set({ campaignId: "cx", content: "x", updatedBy: "uid-cccc-0000" }),
);

console.log("\n== mesa (combat/map/music/npcs) ==");
for (const col of ["combat", "map", "music", "npcs"]) {
  await expect(`${A} cria ${col}/c1`, "allow", () =>
    fsA.collection(col).doc("c1").set({ mock: true }),
  );
  await expect(`${B} escreve em ${col}/c1 (pc)`, "deny", () =>
    fsB.collection(col).doc("c1").set({ mock: true }),
  );
  await expect(`${B} lê ${col}/c1`, "allow", () => fsB.doc(`${col}/c1`).get());
}

console.log("\n== tokens V2 (map/{id}/tokens) ==");
await expect("A (GM) cria token npc escondido", "allow", () =>
  fsA.doc("map/c1/tokens/t-new").set({
    name: "Goblin", icon: "👹", type: "npc", x: 50, y: 50, visible: false,
  }),
);
await expect("B (pc) cria token", "deny", () =>
  fsB.doc("map/c1/tokens/t-hack").set({
    name: "Hack", icon: "👹", type: "npc", x: 1, y: 1, visible: true,
  }),
);
await expect("B lê token visível", "allow", () =>
  fsB.doc("map/c1/tokens/t-visible").get(),
);
await expect("B lê token escondido de outro", "deny", () =>
  fsB.doc("map/c1/tokens/t-hidden").get(),
);
await expect("B (dono) lê próprio escondido", "allow", () =>
  fsB.doc("map/c1/tokens/t-owned-hidden").get(),
);
await expect("C (fora) lê token visível", "deny", () =>
  fsC.doc("map/c1/tokens/t-visible").get(),
);
await expect("B move o próprio token (x/y)", "allow", () =>
  fsB.doc("map/c1/tokens/t-visible").update({ x: 11, y: 12 }),
);
await expect("B tenta revelar o próprio (visible)", "deny", () =>
  fsB.doc("map/c1/tokens/t-owned-hidden").update({ visible: true }),
);
await expect("B move token de outro", "deny", () =>
  fsB.doc("map/c1/tokens/t-hidden").update({ x: 1, y: 1 }),
);
await expect("A (GM) revela token escondido", "allow", () =>
  fsA.doc("map/c1/tokens/t-hidden").update({ visible: true }),
);
await expect("A (GM) move qualquer token", "allow", () =>
  fsA.doc("map/c1/tokens/t-visible").update({ x: 30, y: 30 }),
);
await expect("B lista tokens visíveis (query filtrada)", "allow", () =>
  fsB.collection("map/c1/tokens").where("visible", "==", true).get(),
);
await expect("B deleta token", "deny", () =>
  fsB.doc("map/c1/tokens/t-visible").delete(),
);
await expect("A (GM) deleta token", "allow", () =>
  fsA.doc("map/c1/tokens/t-new").delete(),
);

console.log("\n== users ==");
await expect("A escreve em users/<próprio>", "allow", () =>
  fsA.doc("users/uid-aaaa-0000").set({ name: "A" }),
);
await expect("A escreve em users/<uid do B>", "deny", () =>
  fsA.doc("users/uid-bbbb-0000").set({ name: "Hack" }),
);

console.log("\n== limpeza (delete) ==");
await expect("A apaga c1 (dono)", "allow", () => fsA.doc("campaigns/c1").delete());
await expect("B tenta apagar c2 (não é dono)", "deny", () => fsB.doc("campaigns/c2").delete());

await Promise.all([A.cleanup(), B.cleanup(), C.cleanup(), env.cleanup()]);

console.log(`\nResultado: ${passed} passaram, ${failed} falharam`);
if (failures.length) {
  console.log("\nFalhas:");
  failures.forEach((f) => console.log(`  - ${f}`));
}
process.exit(failed ? 1 : 0);