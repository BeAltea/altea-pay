// Registro central de conectores ERP

import type { ERPConnector } from "../types"

// Mapa de conectores disponíveis
const connectors = new Map<string, ERPConnector>()

// Registra um novo conector
export function registerConnector(connector: ERPConnector) {
  connectors.set(connector.type, connector)
}

// Obtém um conector pelo tipo
export function getConnector(type: string): ERPConnector | undefined {
  return connectors.get(type)
}

// Lista todos os conectores disponíveis
export function listConnectors(): ERPConnector[] {
  return Array.from(connectors.values())
}

// Verifica se um conector está disponível
export function hasConnector(type: string): boolean {
  return connectors.has(type)
}
