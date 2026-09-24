"use client";

import { useRef, useState } from "react";
import { parsePdf } from "@/lib/pdf-parser";
import type { WizardState } from "@/lib/types";

interface PdfImportProps {
  onImport: (state: WizardState) => void;
  onCancel: () => void;
}

export function PdfImport({ onImport, onCancel }: PdfImportProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<WizardState | null>(null);
  const [rawText, setRawText] = useState<string | null>(null);
  const [showRaw, setShowRaw] = useState(false);

  const handleFile = async (file: File) => {
    if (!file.name.endsWith(".pdf")) {
      setError("Selecione um arquivo PDF.");
      return;
    }
    setLoading(true);
    setError(null);
    setPreview(null);
    setRawText(null);

    try {
      const result = await parsePdf(file);
      setPreview(result.state);
      setRawText(result.rawText);

      if (!result.state.nome) {
        setError("Não foi possível detectar o nome do personagem. Verifique se o PDF é uma ficha válida.");
      }
    } catch (e) {
      setError(`Erro ao ler o PDF: ${e instanceof Error ? e.message : "desconhecido"}`);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) void handleFile(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) void handleFile(file);
  };

  const handleConfirm = () => {
    if (preview) onImport(preview);
  };

  const editableFields: { key: string; label: string; value: string | undefined }[] = preview
    ? [
        { key: "nome", label: "Nome", value: preview.nome },
        { key: "conceito", label: "Conceito", value: preview.conceito },
        { key: "classe", label: "Classe", value: preview.classe },
        { key: "subclasse", label: "Subclasse", value: preview.subclasse },
        { key: "origem", label: "Origem", value: preview.origem },
        { key: "regiao", label: "Região", value: preview.regiao },
        { key: "passado", label: "Passado", value: preview.passado },
        { key: "nivel", label: "Nível", value: preview.nivel?.toString() },
        { key: "pulsoRunico", label: "Pulso Rúnico", value: preview.pulsoRunico },
        { key: "historia", label: "História", value: preview.historia },
      ]
    : [];

  return (
    <div className="pdf-import card">
      <h3 className="col-title">Importar ficha em PDF</h3>

      {!preview && (
        <div
          className="pdf-drop-zone"
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleDrop}
          onClick={() => inputRef.current?.click()}
        >
          <input
            ref={inputRef}
            type="file"
            accept=".pdf"
            className="pdf-input-hidden"
            onChange={handleInputChange}
          />
          {loading ? (
            <span className="text-muted">Lendo PDF…</span>
          ) : (
            <>
              <span className="pdf-drop-icon">📄</span>
              <span>Clique ou arraste um PDF aqui</span>
              <small className="text-muted">A ficha será lida e os dados extraídos automaticamente</small>
            </>
          )}
        </div>
      )}

      {error && <div className="alert alert-info">{error}</div>}

      {preview && (
        <div className="pdf-preview">
          <div className="row between" style={{ alignItems: "center" }}>
            <h4 className="text-text" style={{ margin: 0 }}>
              {preview.nome ?? "Personagem sem nome"}
            </h4>
            <button className="btn btn-sm btn-ghost" onClick={() => { setPreview(null); setRawText(null); }}>
              Trocar arquivo
            </button>
          </div>

          <div className="pdf-fields">
            {editableFields.map((f) => (
              <div key={f.key} className="field">
                <label>{f.label}</label>
                <input
                  type="text"
                  value={f.value ?? ""}
                  onChange={(e) => {
                    if (!preview) return;
                    const updated = { ...preview, [f.key]: f.key === "nivel" ? Number(e.target.value) || 1 : e.target.value };
                    setPreview(updated);
                  }}
                  className="input"
                />
              </div>
            ))}
          </div>

          {preview.atributos && Object.keys(preview.atributos).length > 0 && (
            <div className="pdf-attrs">
              <h4 className="text-text">Atributos</h4>
              <div className="row wrap">
                {Object.entries(preview.atributos).map(([attr, val]) => (
                  <div key={attr} className="field" style={{ width: 72 }}>
                    <label>{attr.slice(0, 3)}</label>
                    <input
                      type="number"
                      value={val}
                      onChange={(e) => {
                        if (!preview) return;
                        const updated = { ...preview, atributos: { ...preview.atributos, [attr]: Number(e.target.value) || 10 } };
                        setPreview(updated);
                      }}
                      className="input"
                      min={1}
                      max={30}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          <button className="btn btn-sm btn-ghost" onClick={() => setShowRaw(!showRaw)}>
            {showRaw ? "Ocultar texto bruto" : "Ver texto extraído"}
          </button>
          {showRaw && rawText && (
            <pre className="pdf-raw-text">{rawText}</pre>
          )}

          <div className="row">
            <button className="btn btn-glow" onClick={handleConfirm}>
              Importar ficha
            </button>
            <button className="btn btn-ghost" onClick={onCancel}>
              Cancelar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
