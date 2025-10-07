// Ponto de entrada principal para o módulo de integração ERP

// Importa todos os conectores para registrá-los
import "./connectors/example-erp"
import "./connectors/totvs"

// Exporta tipos e serviços
export * from "./types"
export * from "./erpService"
export { getConnector, listConnectors, hasConnector } from "./connectors"
