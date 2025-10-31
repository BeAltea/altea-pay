import os
import csv
import json
import urllib.request
from datetime import datetime

# Configuração do Supabase
SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_SERVICE_ROLE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")

if not SUPABASE_URL or not SUPABASE_SERVICE_ROLE_KEY:
    print("❌ ERRO: Variáveis de ambiente SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY não encontradas")
    exit(1)

# Função para fazer requisições ao Supabase
def supabase_request(table, method="POST", data=None):
    url = f"{SUPABASE_URL}/rest/v1/{table}"
    headers = {
        "apikey": SUPABASE_SERVICE_ROLE_KEY,
        "Authorization": f"Bearer {SUPABASE_SERVICE_ROLE_KEY}",
        "Content-Type": "application/json",
        "Prefer": "return=representation"
    }
    
    if data:
        data = json.dumps(data).encode('utf-8')
    
    req = urllib.request.Request(url, data=data, headers=headers, method=method)
    
    try:
        with urllib.request.urlopen(req) as response:
            return json.loads(response.read().decode('utf-8'))
    except urllib.error.HTTPError as e:
        error_body = e.read().decode('utf-8')
        raise Exception(f"HTTP {e.code}: {error_body}")

print("=" * 80)
print("🚀 INICIANDO IMPORTAÇÃO DA EMPRESA VMAX")
print("=" * 80)

# Dados da empresa
company_data = {
    "name": "VMAX",
    "cnpj": "07.685.452/0001-01",
    "email": "solange@vmax.com.br",
    "phone": "",
    "address": "Rua Antonio Carlos Gilli, 11, Itatiba/SP",
}

print("\n📋 Dados da empresa:")
print(f"   Nome: {company_data['name']}")
print(f"   CNPJ: {company_data['cnpj']}")
print(f"   Email: {company_data['email']}")
print(f"   Endereço: {company_data['address']}")

# 1. Criar a empresa
print("\n🏢 Criando empresa VMAX...")
try:
    company_result = supabase_request("companies", "POST", company_data)
    company_id = company_result[0]["id"]
    print(f"✅ Empresa criada com sucesso! ID: {company_id}")
except Exception as e:
    print(f"❌ ERRO ao criar empresa: {str(e)}")
    exit(1)

# 2. Ler o CSV
csv_path = "scripts/vmax_clientes.csv"
print(f"\n📄 Lendo arquivo CSV: {csv_path}")

try:
    with open(csv_path, 'r', encoding='utf-8') as file:
        csv_reader = csv.DictReader(file, delimiter=';')
        rows = list(csv_reader)
        print(f"✅ CSV lido com sucesso! Total de linhas: {len(rows)}")
except Exception as e:
    print(f"❌ ERRO ao ler CSV: {str(e)}")
    exit(1)

# 3. Processar e inserir clientes e dívidas
print("\n👥 Processando clientes e dívidas...")
clientes_inseridos = 0
dividas_inseridas = 0
erros = []

for idx, row in enumerate(rows, 1):
    try:
        # Extrair dados do cliente
        documento = row.get("CPF/CNPJ", "").strip()
        nome = row.get("Cliente", "").strip()
        cidade = row.get("Cidade", "").strip()
        
        # Extrair dados da dívida
        valor_str = row.get("Vencido", "").strip()
        data_vencimento_str = row.get("Primeira Vencida", "").strip()
        dias_inadimplencia = row.get("Dias Inad.", "0").strip()
        data_cancelamento_str = row.get("DT Cancelamento", "").strip()
        
        # Validar dados obrigatórios
        if not documento or not nome:
            erros.append(f"Linha {idx}: Cliente sem documento ou nome")
            continue
        
        # Limpar e converter valor (R$ 259,80 → 259.80)
        valor = 0.0
        if valor_str:
            valor_limpo = valor_str.replace("R$", "").replace(".", "").replace(",", ".").strip()
            try:
                valor = float(valor_limpo)
            except:
                erros.append(f"Linha {idx}: Valor inválido '{valor_str}'")
                continue
        
        # Converter data de vencimento (25/06/2025 → 2025-06-25)
        due_date = None
        if data_vencimento_str:
            try:
                due_date = datetime.strptime(data_vencimento_str, "%d/%m/%Y").strftime("%Y-%m-%d")
            except:
                erros.append(f"Linha {idx}: Data de vencimento inválida '{data_vencimento_str}'")
                continue
        
        # Determinar status da dívida
        status = "cancelled" if data_cancelamento_str else "overdue"
        
        # Determinar classificação baseada nos dias de inadimplência
        try:
            dias = int(dias_inadimplencia) if dias_inadimplencia else 0
        except:
            dias = 0
        
        if dias <= 90:
            classification = "low"
        elif dias <= 180:
            classification = "medium"
        elif dias <= 365:
            classification = "high"
        else:
            classification = "critical"
        
        # Inserir cliente
        customer_data = {
            "company_id": company_id,
            "name": nome,
            "document": documento,
            "email": "",
            "phone": "",
            "address": "",
            "city": cidade,
            "state": "SP",
            "zip_code": "",
        }
        
        customer_result = supabase_request("customers", "POST", customer_data)
        customer_id = customer_result[0]["id"]
        clientes_inseridos += 1
        
        # Inserir dívida
        debt_data = {
            "company_id": company_id,
            "customer_id": customer_id,
            "amount": valor,
            "due_date": due_date,
            "status": status,
            "classification": classification,
            "description": "Fatura em aberto"
        }
        
        supabase_request("debts", "POST", debt_data)
        dividas_inseridas += 1
        
        # Log de progresso a cada 10 clientes
        if idx % 10 == 0:
            print(f"   Processados {idx}/{len(rows)} clientes...")
        
    except Exception as e:
        erros.append(f"Linha {idx}: {str(e)}")
        continue

# 4. Resumo final
print("\n" + "=" * 80)
print("✅ IMPORTAÇÃO CONCLUÍDA!")
print("=" * 80)
print(f"🏢 Empresa: VMAX (ID: {company_id})")
print(f"👥 Clientes inseridos: {clientes_inseridos}/{len(rows)}")
print(f"💰 Dívidas inseridas: {dividas_inseridas}/{len(rows)}")

if erros:
    print(f"\n⚠️  Erros encontrados ({len(erros)}):")
    for erro in erros[:10]:  # Mostrar apenas os primeiros 10 erros
        print(f"   - {erro}")
    if len(erros) > 10:
        print(f"   ... e mais {len(erros) - 10} erros")
else:
    print("\n🎉 Nenhum erro encontrado!")

print("\n" + "=" * 80)
