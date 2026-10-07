"use client";

import { useState, useTransition } from "react";
import {
  createLogisticsCompany,
  updateLogisticsCompany,
  deleteLogisticsCompany,
  createRoutingRule,
  updateRoutingRule,
  deleteRoutingRule,
} from "@/lib/actions/logistics";
import {
  Truck,
  Plus,
  Trash2,
  Pencil,
  ChevronDown,
  ChevronRight,
  Loader2,
  Globe,
  MapPin,
} from "lucide-react";
import { toast } from "@/lib/toast";
import { RuleType } from "@prisma/client";

// ─── Tipos ───────────────────────────────────────────────────────────────────

interface Company {
  id: string;
  name: string;
  isInternal: boolean;
  active: boolean;
  website: string | null;
  trackingUrlTemplate: string | null;
  notes: string | null;
  _count: { shipments: number };
}

interface Rule {
  id: string;
  type: RuleType;
  pattern: string;
  priority: number;
  active: boolean;
  notes: string | null;
  logisticsCompanyId: string;
  logisticsCompany: { name: string; isInternal: boolean };
}

interface Props {
  companies: Company[];
  rules: Rule[];
}

// ─── Labels ──────────────────────────────────────────────────────────────────

const RULE_TYPE_LABELS: Record<RuleType, string> = {
  POSTAL_CODE: "Código postal",
  PROVINCE: "Provincia",
  CITY: "Ciudad",
};

// ─── Componente principal ────────────────────────────────────────────────────

export default function LogisticsConfig({ companies: initial, rules: initialRules }: Props) {
  const [companies, setCompanies] = useState(initial);
  const [rules, setRules] = useState(initialRules);
  const [showNewCompany, setShowNewCompany] = useState(false);
  const [showRules, setShowRules] = useState(false);
  const [isPending, startTransition] = useTransition();

  // ─── Nueva empresa ─────────────────────────────────────────────────────────

  const [newCompany, setNewCompany] = useState({
    name: "",
    isInternal: false,
    website: "",
    trackingUrlTemplate: "",
    notes: "",
  });

  function handleAddCompany() {
    if (!newCompany.name.trim()) {
      toast.error("El nombre es obligatorio");
      return;
    }
    startTransition(async () => {
      try {
        await createLogisticsCompany({
          name: newCompany.name.trim(),
          isInternal: newCompany.isInternal,
          website: newCompany.website.trim() || undefined,
          trackingUrlTemplate: newCompany.trackingUrlTemplate.trim() || undefined,
          notes: newCompany.notes.trim() || undefined,
        });
        setNewCompany({ name: "", isInternal: false, website: "", trackingUrlTemplate: "", notes: "" });
        setShowNewCompany(false);
        toast.success("Empresa agregada");
        // Forzar recarga
        window.location.reload();
      } catch (err: any) {
        toast.error(err.message);
      }
    });
  }

  function handleToggleActive(id: string, active: boolean) {
    startTransition(async () => {
      try {
        await updateLogisticsCompany(id, { active: !active });
        toast.success(!active ? "Empresa activada" : "Empresa desactivada");
        window.location.reload();
      } catch (err: any) {
        toast.error(err.message);
      }
    });
  }

  function handleDeleteCompany(id: string, name: string) {
    if (!confirm(`¿Eliminar la empresa "${name}"? También se eliminarán sus reglas de ruteo.`)) return;
    startTransition(async () => {
      try {
        await deleteLogisticsCompany(id);
        toast.success("Empresa eliminada");
        window.location.reload();
      } catch (err: any) {
        toast.error(err.message);
      }
    });
  }

  // ─── Nueva regla ───────────────────────────────────────────────────────────

  const [newRule, setNewRule] = useState({
    logisticsCompanyId: "",
    type: "POSTAL_CODE" as RuleType,
    pattern: "",
    priority: 0,
    notes: "",
  });

  function handleAddRule() {
    if (!newRule.logisticsCompanyId) { toast.error("Seleccioná una empresa"); return; }
    if (!newRule.pattern.trim()) { toast.error("El patrón es obligatorio"); return; }
    startTransition(async () => {
      try {
        await createRoutingRule({
          logisticsCompanyId: newRule.logisticsCompanyId,
          type: newRule.type,
          pattern: newRule.pattern.trim(),
          priority: Number(newRule.priority),
          notes: newRule.notes.trim() || undefined,
        });
        setNewRule({ logisticsCompanyId: "", type: "POSTAL_CODE", pattern: "", priority: 0, notes: "" });
        toast.success("Regla agregada");
        window.location.reload();
      } catch (err: any) {
        toast.error(err.message);
      }
    });
  }

  function handleToggleRule(id: string, active: boolean) {
    startTransition(async () => {
      try {
        await updateRoutingRule(id, { active: !active });
        window.location.reload();
      } catch (err: any) {
        toast.error(err.message);
      }
    });
  }

  function handleDeleteRule(id: string) {
    if (!confirm("¿Eliminar esta regla de ruteo?")) return;
    startTransition(async () => {
      try {
        await deleteRoutingRule(id);
        window.location.reload();
      } catch (err: any) {
        toast.error(err.message);
      }
    });
  }

  return (
    <div className="space-y-6">
      {/* ── Empresas ── */}
      <section className="bg-white border rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Truck size={18} className="text-gray-400" />
            <h2 className="font-semibold text-gray-900">Empresas</h2>
            <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
              {companies.length}
            </span>
          </div>
          <button
            onClick={() => setShowNewCompany(!showNewCompany)}
            className="flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-700 font-medium"
          >
            <Plus size={15} />
            Agregar
          </button>
        </div>

        {/* Formulario nueva empresa */}
        {showNewCompany && (
          <div className="px-5 py-4 bg-blue-50 border-b space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <input
                value={newCompany.name}
                onChange={(e) => setNewCompany({ ...newCompany, name: e.target.value })}
                placeholder="Nombre de la empresa *"
                className="border rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <input
                value={newCompany.website}
                onChange={(e) => setNewCompany({ ...newCompany, website: e.target.value })}
                placeholder="Sitio web (opcional)"
                className="border rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <input
              value={newCompany.trackingUrlTemplate}
              onChange={(e) => setNewCompany({ ...newCompany, trackingUrlTemplate: e.target.value })}
              placeholder="Template de URL de tracking con {code}: https://empresa.com/tracking/{code}"
              className="w-full border rounded-lg px-3 py-2 text-sm font-mono bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <input
              value={newCompany.notes}
              onChange={(e) => setNewCompany({ ...newCompany, notes: e.target.value })}
              placeholder="Notas internas (opcional)"
              className="w-full border rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={newCompany.isInternal}
                  onChange={(e) => setNewCompany({ ...newCompany, isInternal: e.target.checked })}
                  className="rounded"
                />
                Flota propia (nuestros choferes)
              </label>
              <div className="flex gap-2 ml-auto">
                <button
                  onClick={() => setShowNewCompany(false)}
                  className="text-sm text-gray-500 hover:text-gray-700 px-3 py-1.5"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleAddCompany}
                  disabled={isPending}
                  className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-1.5 rounded-lg disabled:opacity-60 transition-colors"
                >
                  {isPending && <Loader2 size={13} className="animate-spin" />}
                  Guardar
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Lista de empresas */}
        <div className="divide-y">
          {companies.length === 0 && (
            <p className="text-center text-sm text-gray-400 py-8">
              No hay empresas configuradas.
            </p>
          )}
          {companies.map((company) => (
            <div
              key={company.id}
              className={`flex items-center gap-4 px-5 py-3.5 ${
                !company.active ? "opacity-50" : ""
              }`}
            >
              <div
                className={`w-2 h-2 rounded-full flex-shrink-0 ${
                  company.isInternal ? "bg-green-500" : "bg-purple-400"
                }`}
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm text-gray-900">{company.name}</span>
                  {company.isInternal && (
                    <span className="text-xs bg-green-50 text-green-700 px-1.5 py-0.5 rounded">
                      Flota propia
                    </span>
                  )}
                </div>
                <div className="text-xs text-gray-400 mt-0.5 space-x-3">
                  {company.website && (
                    <a
                      href={company.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 hover:text-blue-500 transition-colors"
                    >
                      <Globe size={11} /> {company.website}
                    </a>
                  )}
                  <span>{company._count.shipments} envío(s)</span>
                </div>
                {company.trackingUrlTemplate && (
                  <p className="text-xs text-gray-300 font-mono mt-0.5 truncate">
                    {company.trackingUrlTemplate}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => handleToggleActive(company.id, company.active)}
                  className="text-xs text-gray-400 hover:text-gray-700 px-2 py-1 rounded hover:bg-gray-100 transition-colors"
                >
                  {company.active ? "Desactivar" : "Activar"}
                </button>
                <button
                  onClick={() => handleDeleteCompany(company.id, company.name)}
                  className="p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Reglas de ruteo ── */}
      <section className="bg-white border rounded-xl overflow-hidden">
        <button
          onClick={() => setShowRules(!showRules)}
          className="w-full px-5 py-4 border-b flex items-center justify-between hover:bg-gray-50 transition-colors"
        >
          <div className="flex items-center gap-2">
            <MapPin size={18} className="text-gray-400" />
            <h2 className="font-semibold text-gray-900">Reglas de ruteo automático</h2>
            <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
              {rules.length}
            </span>
          </div>
          {showRules ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
        </button>

        {showRules && (
          <>
            <div className="px-5 py-3 bg-amber-50 border-b">
              <p className="text-xs text-amber-700">
                Las reglas se aplican en orden de prioridad (mayor número = mayor prioridad) al asignar logística a un envío.
                Se usa el <strong>código postal</strong>, la <strong>provincia</strong> o la <strong>ciudad</strong> del destinatario.
              </p>
            </div>

            {/* Tabla de reglas */}
            <div className="divide-y">
              {rules.length === 0 && (
                <p className="text-center text-sm text-gray-400 py-6">
                  No hay reglas configuradas.
                </p>
              )}
              {rules.map((rule) => (
                <div
                  key={rule.id}
                  className={`flex items-center gap-4 px-5 py-3 ${
                    !rule.active ? "opacity-50" : ""
                  }`}
                >
                  <span className="text-xs font-mono bg-gray-100 px-2 py-0.5 rounded w-8 text-center text-gray-600">
                    {rule.priority}
                  </span>
                  <div className="flex-1">
                    <span className="text-sm text-gray-500 mr-2">
                      {RULE_TYPE_LABELS[rule.type]}
                    </span>
                    <span className="font-mono text-sm text-gray-900 font-medium">
                      "{rule.pattern}"
                    </span>
                    <span className="text-gray-400 text-sm mx-2">→</span>
                    <span
                      className={`text-sm font-medium ${
                        rule.logisticsCompany.isInternal ? "text-green-700" : "text-purple-700"
                      }`}
                    >
                      {rule.logisticsCompany.name}
                    </span>
                    {rule.notes && (
                      <span className="text-xs text-gray-400 ml-2">({rule.notes})</span>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleToggleRule(rule.id, rule.active)}
                      className="text-xs text-gray-400 hover:text-gray-700 px-2 py-1 rounded hover:bg-gray-100 transition-colors"
                    >
                      {rule.active ? "Desactivar" : "Activar"}
                    </button>
                    <button
                      onClick={() => handleDeleteRule(rule.id)}
                      className="p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Nueva regla */}
            <div className="px-5 py-4 bg-gray-50 border-t">
              <p className="text-xs font-medium text-gray-600 mb-3">Nueva regla</p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <select
                  value={newRule.logisticsCompanyId}
                  onChange={(e) => setNewRule({ ...newRule, logisticsCompanyId: e.target.value })}
                  className="border rounded-lg px-2 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Empresa *</option>
                  {companies.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
                <select
                  value={newRule.type}
                  onChange={(e) => setNewRule({ ...newRule, type: e.target.value as RuleType })}
                  className="border rounded-lg px-2 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {Object.entries(RULE_TYPE_LABELS).map(([k, v]) => (
                    <option key={k} value={k}>
                      {v}
                    </option>
                  ))}
                </select>
                <input
                  value={newRule.pattern}
                  onChange={(e) => setNewRule({ ...newRule, pattern: e.target.value })}
                  placeholder={
                    newRule.type === "POSTAL_CODE"
                      ? 'Ej: "4000" o "14"'
                      : newRule.type === "PROVINCE"
                      ? "Ej: Salta"
                      : "Ej: Rosario"
                  }
                  className="border rounded-lg px-2 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <div className="flex gap-2">
                  <input
                    type="number"
                    value={newRule.priority}
                    onChange={(e) => setNewRule({ ...newRule, priority: Number(e.target.value) })}
                    placeholder="Prioridad"
                    min="0"
                    className="w-20 border rounded-lg px-2 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <button
                    onClick={handleAddRule}
                    disabled={isPending}
                    className="flex items-center gap-1 bg-gray-900 hover:bg-gray-800 text-white text-sm font-medium px-3 py-2 rounded-lg disabled:opacity-60 transition-colors"
                  >
                    {isPending ? <Loader2 size={13} className="animate-spin" /> : <Plus size={13} />}
                    Agregar
                  </button>
                </div>
              </div>
            </div>
          </>
        )}
      </section>
    </div>
  );
}
