import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const { customer, score, source, analysis_type, data } = await request.json()

    if (!customer || !data) {
      return NextResponse.json({ error: "Customer data and analysis data are required" }, { status: 400 })
    }

    // Gerar HTML do PDF
    const html = generatePDFHTML({
      name: customer.name,
      cpf: customer.document,
      city: customer.city,
      email: customer.email,
      phone: customer.phone,
      score,
      source,
      analysis_type,
      data,
      created_at: new Date().toISOString(),
    })

    // Retornar HTML completo
    return new NextResponse(html, {
      headers: {
        "Content-Type": "text/html; charset=utf-8",
      },
    })
  } catch (error: any) {
    console.error("[v0] export-analysis-pdf - Error:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

function generatePDFHTML(analysis: any): string {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  const getScoreColor = (score: number | null) => {
    if (!score) return "#6B7280"
    if (score >= 700) return "#10B981"
    if (score >= 500) return "#F59E0B"
    return "#EF4444"
  }

  const getRiskLevel = (score: number | null) => {
    if (!score) return "Não Avaliado"
    if (score >= 700) return "Baixo Risco"
    if (score >= 500) return "Risco Médio"
    if (score >= 300) return "Alto Risco"
    return "Risco Muito Alto"
  }

  const scoreColor = getScoreColor(analysis.score)
  const riskLevel = getRiskLevel(analysis.score)

  const totalCEIS = analysis.data?.sancoes_ceis?.length || 0
  const totalCNEP = analysis.data?.punicoes_cnep?.length || 0
  const totalCEPIM = analysis.data?.impedimentos_cepim?.length || 0
  const totalCEAF = analysis.data?.expulsoes_ceaf?.length || 0
  const totalRestrictions = totalCEIS + totalCNEP + totalCEPIM + totalCEAF

  return `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Relatório de Análise de Crédito - ${analysis.name}</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      line-height: 1.6;
      color: #1F2937;
      background: #F9FAFB;
      padding: 0;
    }
    
    .container {
      max-width: 1200px;
      margin: 0 auto;
      background: white;
      min-height: 100vh;
    }
    
    .no-print {
      padding: 20px;
      background: #3B82F6;
      color: white;
      text-align: center;
    }
    
    .no-print button {
      background: white;
      color: #3B82F6;
      border: none;
      padding: 12px 32px;
      border-radius: 8px;
      font-size: 16px;
      font-weight: 600;
      cursor: pointer;
      margin-top: 10px;
    }
    
    .no-print button:hover {
      background: #F3F4F6;
    }
    
    .content {
      padding: 40px;
    }
    
    .header {
      text-align: center;
      margin-bottom: 40px;
      padding-bottom: 20px;
      border-bottom: 4px solid #3B82F6;
    }
    
    .header h1 {
      font-size: 32px;
      color: #1F2937;
      margin-bottom: 10px;
      font-weight: 700;
    }
    
    .header p {
      color: #6B7280;
      font-size: 14px;
    }
    
    .section {
      margin-bottom: 35px;
      page-break-inside: avoid;
    }
    
    .section-title {
      font-size: 20px;
      font-weight: 700;
      color: #1F2937;
      margin-bottom: 20px;
      padding-bottom: 10px;
      border-bottom: 3px solid #E5E7EB;
      display: flex;
      align-items: center;
      gap: 12px;
    }
    
    .section-icon {
      font-size: 24px;
    }
    
    .info-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 20px;
      margin-bottom: 20px;
    }
    
    .info-item {
      padding: 18px;
      background: #F9FAFB;
      border-radius: 10px;
      border-left: 5px solid #3B82F6;
    }
    
    .info-label {
      font-size: 12px;
      color: #6B7280;
      text-transform: uppercase;
      letter-spacing: 0.8px;
      margin-bottom: 6px;
      font-weight: 600;
    }
    
    .info-value {
      font-size: 17px;
      font-weight: 600;
      color: #1F2937;
    }
    
    .score-box {
      background: linear-gradient(135deg, #3B82F6 0%, #2563EB 100%);
      color: white;
      padding: 40px;
      border-radius: 16px;
      text-align: center;
      margin-bottom: 35px;
      box-shadow: 0 10px 25px rgba(59, 130, 246, 0.3);
    }
    
    .score-value {
      font-size: 80px;
      font-weight: 800;
      margin-bottom: 15px;
      color: white;
      text-shadow: 3px 3px 6px rgba(0, 0, 0, 0.3);
    }
    
    .score-label {
      font-size: 16px;
      opacity: 0.95;
      margin-bottom: 8px;
      font-weight: 500;
    }
    
    .risk-badge {
      display: inline-block;
      padding: 10px 24px;
      background: rgba(255, 255, 255, 0.25);
      border-radius: 25px;
      font-size: 16px;
      font-weight: 700;
      margin-top: 12px;
      backdrop-filter: blur(10px);
    }
    
    .summary-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 15px;
      margin-bottom: 35px;
    }
    
    .summary-card {
      background: #F9FAFB;
      padding: 20px;
      border-radius: 12px;
      text-align: center;
      border: 2px solid #E5E7EB;
    }
    
    .summary-card.danger {
      background: #FEF2F2;
      border-color: #FCA5A5;
    }
    
    .summary-card.warning {
      background: #FFFBEB;
      border-color: #FCD34D;
    }
    
    .summary-card.success {
      background: #F0FDF4;
      border-color: #86EFAC;
    }
    
    .summary-number {
      font-size: 36px;
      font-weight: 800;
      margin-bottom: 5px;
    }
    
    .summary-label {
      font-size: 13px;
      color: #6B7280;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    
    .alert-box {
      padding: 18px;
      border-radius: 10px;
      margin-bottom: 18px;
      border-left: 5px solid;
    }
    
    .alert-danger {
      background: #FEF2F2;
      border-color: #EF4444;
      color: #991B1B;
    }
    
    .alert-warning {
      background: #FFFBEB;
      border-color: #F59E0B;
      color: #92400E;
    }
    
    .alert-info {
      background: #EFF6FF;
      border-color: #3B82F6;
      color: #1E40AF;
    }
    
    .alert-success {
      background: #F0FDF4;
      border-color: #10B981;
      color: #065F46;
    }
    
    .alert-title {
      font-weight: 700;
      margin-bottom: 8px;
      font-size: 15px;
    }
    
    .alert-content {
      font-size: 14px;
      line-height: 1.6;
    }
    
    .list-item {
      padding: 16px;
      background: #F9FAFB;
      border-radius: 8px;
      margin-bottom: 12px;
      border-left: 4px solid #3B82F6;
    }
    
    .list-item-title {
      font-weight: 700;
      color: #1F2937;
      margin-bottom: 8px;
      font-size: 15px;
    }
    
    .list-item-detail {
      font-size: 14px;
      color: #6B7280;
      margin-bottom: 4px;
    }
    
    .list-item-detail strong {
      color: #1F2937;
      font-weight: 600;
    }
    
    .footer {
      margin-top: 60px;
      padding-top: 30px;
      border-top: 3px solid #E5E7EB;
      text-align: center;
      color: #6B7280;
      font-size: 13px;
    }
    
    .footer-logo {
      font-size: 20px;
      font-weight: 700;
      color: #3B82F6;
      margin-bottom: 10px;
    }
    
    .badge {
      display: inline-block;
      padding: 6px 14px;
      border-radius: 14px;
      font-size: 13px;
      font-weight: 700;
      margin-right: 8px;
    }
    
    .badge-success {
      background: #D1FAE5;
      color: #065F46;
    }
    
    .badge-danger {
      background: #FEE2E2;
      color: #991B1B;
    }
    
    .badge-warning {
      background: #FEF3C7;
      color: #92400E;
    }
    
    .badge-info {
      background: #DBEAFE;
      color: #1E40AF;
    }
    
    .empty-state {
      text-align: center;
      padding: 40px;
      background: #F9FAFB;
      border-radius: 12px;
      border: 2px dashed #D1D5DB;
    }
    
    .empty-state-icon {
      font-size: 48px;
      margin-bottom: 15px;
    }
    
    .empty-state-text {
      color: #6B7280;
      font-size: 15px;
    }
    
    @media print {
      body {
        background: white;
      }
      
      .no-print {
        display: none !important;
      }
      
      .container {
        max-width: 100%;
      }
      
      .content {
        padding: 20px;
      }
      
      .section {
        page-break-inside: avoid;
      }
      
      .score-box {
        box-shadow: none;
        border: 2px solid #3B82F6;
      }
    }
    
    @page {
      margin: 1.5cm;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="no-print">
      <h2>Relatório Pronto para Download</h2>
      <p>Clique no botão abaixo para baixar o relatório em PDF</p>
      <button onclick="window.print()">📥 Baixar como PDF</button>
    </div>
    
    <div class="content">
      <div class="header">
        <h1>📊 Relatório de Análise de Crédito</h1>
        <p>Documento gerado em ${formatDate(analysis.created_at)}</p>
        <div style="margin-top: 15px;">
          <span class="badge ${analysis.source === "assertiva" ? "badge-success" : "badge-info"}">
            ${analysis.source === "assertiva" ? "Análise Assertiva" : "Análise Portal da Transparência"}
          </span>
          <span class="badge badge-warning">
            ${analysis.analysis_type === "free" ? "Análise Gratuita" : "Análise Detalhada"}
          </span>
        </div>
      </div>

      <!-- Resumo Executivo -->
      <div class="section">
        <div class="section-title">
          <span class="section-icon">📈</span> Resumo Executivo
        </div>
        <div class="summary-grid">
          <div class="summary-card ${totalRestrictions === 0 ? "success" : totalRestrictions < 5 ? "warning" : "danger"}">
            <div class="summary-number" style="color: ${totalRestrictions === 0 ? "#10B981" : totalRestrictions < 5 ? "#F59E0B" : "#EF4444"}">
              ${totalRestrictions}
            </div>
            <div class="summary-label">Total de Restrições</div>
          </div>
          <div class="summary-card">
            <div class="summary-number" style="color: #6B7280">
              ${totalCEIS + totalCNEP}
            </div>
            <div class="summary-label">Sanções e Punições</div>
          </div>
          <div class="summary-card">
            <div class="summary-number" style="color: #6B7280">
              ${totalCEPIM + totalCEAF}
            </div>
            <div class="summary-label">Impedimentos e Expulsões</div>
          </div>
        </div>
      </div>

      <!-- Informações Básicas -->
      <div class="section">
        <div class="section-title">
          <span class="section-icon">👤</span> Informações do Cliente
        </div>
        <div class="info-grid">
          <div class="info-item">
            <div class="info-label">Nome Completo</div>
            <div class="info-value">${analysis.name || "N/A"}</div>
          </div>
          <div class="info-item">
            <div class="info-label">CPF/CNPJ</div>
            <div class="info-value">${analysis.cpf}</div>
          </div>
          <div class="info-item">
            <div class="info-label">Cidade</div>
            <div class="info-value">${analysis.city || "N/A"}</div>
          </div>
          <div class="info-item">
            <div class="info-label">Email</div>
            <div class="info-value">${analysis.email || "N/A"}</div>
          </div>
          <div class="info-item">
            <div class="info-label">Telefone</div>
            <div class="info-value">${analysis.phone || "N/A"}</div>
          </div>
          <div class="info-item">
            <div class="info-label">Data da Análise</div>
            <div class="info-value">${formatDate(analysis.created_at)}</div>
          </div>
        </div>
      </div>

      <!-- Score de Crédito -->
      <div class="section">
        <div class="score-box">
          <div class="score-label">Score de Crédito</div>
          <div class="score-value">${analysis.score || "N/A"}</div>
          <div class="risk-badge">${riskLevel}</div>
        </div>
      </div>

      ${
        analysis.data?.situacao_cpf
          ? `
      <!-- Situação do CPF/CNPJ -->
      <div class="section">
        <div class="section-title">
          <span class="section-icon">📄</span> Situação do Documento
        </div>
        <div class="alert-box ${analysis.data.situacao_cpf === "REGULAR" ? "alert-success" : "alert-danger"}">
          <div class="alert-title">Status: ${analysis.data.situacao_cpf}</div>
          <div class="alert-content">
            ${analysis.data.situacao_cpf === "REGULAR" ? "✅ Documento em situação regular perante a Receita Federal." : "⚠️ Documento com restrições. Verificar pendências junto à Receita Federal."}
          </div>
        </div>
      </div>
      `
          : ""
      }

      ${
        totalCEIS > 0
          ? `
      <!-- Sanções CEIS -->
      <div class="section">
        <div class="section-title">
          <span class="section-icon">⚠️</span> Sanções CEIS - Cadastro de Empresas Inidôneas e Suspensas (${totalCEIS})
        </div>
        ${analysis.data.sancoes_ceis
          .map(
            (sancao: any) => `
          <div class="alert-box alert-danger">
            <div class="alert-title">${sancao.fonteSancao?.nomeExibicao || sancao.orgaoSancionador || "Órgão não informado"}</div>
            <div class="alert-content">
              ${sancao.tipoSancao ? `<strong>Tipo de Sanção:</strong> ${sancao.tipoSancao}<br>` : ""}
              ${sancao.dataPublicacao ? `<strong>Data de Publicação:</strong> ${new Date(sancao.dataPublicacao).toLocaleDateString("pt-BR")}<br>` : ""}
              ${sancao.dataInicioSancao ? `<strong>Data de Início:</strong> ${new Date(sancao.dataInicioSancao).toLocaleDateString("pt-BR")}<br>` : ""}
              ${sancao.dataFimSancao ? `<strong>Data de Término:</strong> ${new Date(sancao.dataFimSancao).toLocaleDateString("pt-BR")}<br>` : ""}
              ${sancao.fundamentacaoLegal ? `<strong>Fundamentação Legal:</strong> ${sancao.fundamentacaoLegal}` : ""}
            </div>
          </div>
        `,
          )
          .join("")}
      </div>
      `
          : ""
      }

      ${
        totalCNEP > 0
          ? `
      <!-- Punições CNEP -->
      <div class="section">
        <div class="section-title">
          <span class="section-icon">🚫</span> Punições CNEP - Cadastro Nacional de Empresas Punidas (${totalCNEP})
        </div>
        ${analysis.data.punicoes_cnep
          .map(
            (punicao: any) => `
          <div class="alert-box alert-warning">
            <div class="alert-title">${punicao.orgaoSancionador?.nome || "Órgão não informado"}</div>
            <div class="alert-content">
              ${punicao.tipoSancao?.descricaoResumida ? `<strong>Tipo de Sanção:</strong> ${punicao.tipoSancao.descricaoResumida}<br>` : ""}
              ${punicao.dataPublicacaoSancao ? `<strong>Data de Publicação:</strong> ${new Date(punicao.dataPublicacaoSancao).toLocaleDateString("pt-BR")}<br>` : ""}
              ${punicao.dataInicioSancao ? `<strong>Data de Início:</strong> ${new Date(punicao.dataInicioSancao).toLocaleDateString("pt-BR")}<br>` : ""}
              ${punicao.dataFimSancao ? `<strong>Data de Término:</strong> ${new Date(punicao.dataFimSancao).toLocaleDateString("pt-BR")}<br>` : ""}
              ${punicao.valorMulta ? `<strong>Valor da Multa:</strong> R$ ${Number.parseFloat(punicao.valorMulta).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}<br>` : ""}
              ${punicao.fundamentacaoLegal ? `<strong>Fundamentação Legal:</strong> ${punicao.fundamentacaoLegal}` : ""}
            </div>
          </div>
        `,
          )
          .join("")}
      </div>
      `
          : ""
      }

      ${
        totalCEPIM > 0
          ? `
      <!-- Impedimentos CEPIM -->
      <div class="section">
        <div class="section-title">
          <span class="section-icon">🔒</span> Impedimentos CEPIM - Entidades Privadas sem Fins Lucrativos Impedidas (${totalCEPIM})
        </div>
        ${analysis.data.impedimentos_cepim
          .map(
            (impedimento: any) => `
          <div class="alert-box alert-danger">
            <div class="alert-title">${impedimento.orgaoSancionador?.nome || "Órgão não informado"}</div>
            <div class="alert-content">
              ${impedimento.motivoImpedimento ? `<strong>Motivo:</strong> ${impedimento.motivoImpedimento}<br>` : ""}
              ${impedimento.dataInicioImpedimento ? `<strong>Data de Início:</strong> ${new Date(impedimento.dataInicioImpedimento).toLocaleDateString("pt-BR")}<br>` : ""}
              ${impedimento.dataFimImpedimento ? `<strong>Data de Término:</strong> ${new Date(impedimento.dataFimImpedimento).toLocaleDateString("pt-BR")}` : ""}
            </div>
          </div>
        `,
          )
          .join("")}
      </div>
      `
          : ""
      }

      ${
        totalCEAF > 0
          ? `
      <!-- Expulsões CEAF -->
      <div class="section">
        <div class="section-title">
          <span class="section-icon">❌</span> Expulsões CEAF - Cadastro de Expulsões da Administração Federal (${totalCEAF})
        </div>
        ${analysis.data.expulsoes_ceaf
          .map(
            (expulsao: any) => `
          <div class="alert-box alert-danger">
            <div class="alert-title">${expulsao.orgao || "Órgão não informado"}</div>
            <div class="alert-content">
              ${expulsao.tipoExpulsao ? `<strong>Tipo de Expulsão:</strong> ${expulsao.tipoExpulsao}<br>` : ""}
              ${expulsao.dataExpulsao ? `<strong>Data da Expulsão:</strong> ${new Date(expulsao.dataExpulsao).toLocaleDateString("pt-BR")}<br>` : ""}
              ${expulsao.motivo ? `<strong>Motivo:</strong> ${expulsao.motivo}` : ""}
            </div>
          </div>
        `,
          )
          .join("")}
      </div>
      `
          : ""
      }

      ${
        totalRestrictions === 0
          ? `
      <!-- Estado Limpo -->
      <div class="section">
        <div class="empty-state">
          <div class="empty-state-icon">✅</div>
          <div class="empty-state-text">
            <strong>Nenhuma restrição encontrada!</strong><br>
            Este cliente não possui sanções, punições, impedimentos ou expulsões registradas no Portal da Transparência.
          </div>
        </div>
      </div>
      `
          : ""
      }

      <div class="footer">
        <div class="footer-logo">CobrançaAuto System</div>
        <p><strong>Relatório Confidencial de Análise de Crédito</strong></p>
        <p>Este documento é confidencial e destinado exclusivamente para fins de análise de crédito e gestão de risco.</p>
        <p>Os dados foram obtidos através do Portal da Transparência do Governo Federal.</p>
        <p style="margin-top: 15px;">Gerado automaticamente pelo sistema em ${formatDate(analysis.created_at)}</p>
      </div>
    </div>
  </div>
  
  <script>
    // Auto-trigger print dialog after page loads
    window.addEventListener('load', function() {
      setTimeout(function() {
        // Uncomment the line below to auto-trigger print on load
        // window.print();
      }, 500);
    });
  </script>
</body>
</html>
  `
}
