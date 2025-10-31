import os
from supabase import create_client, Client
from datetime import datetime

# Configuração do Supabase
SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

print("=" * 80)
print("🚀 INICIANDO IMPORTAÇÃO DA EMPRESA VMAX")
print("=" * 80)

# Dados da empresa
company_data = {
    "name": "VMAX",
    "cnpj": "07.685.452/0001-01",
    "email": "solange@vmax.com.br",
    "address": "Rua Antonio Carlos Gilli, 11, Itatiba/SP",
    "phone": "",
    "status": "active"
}

print("\n📋 Dados da empresa:")
print(f"   Nome: {company_data['name']}")
print(f"   CNPJ: {company_data['cnpj']}")
print(f"   Email: {company_data['email']}")
print(f"   Endereço: {company_data['address']}")

# Tentar buscar empresa existente ou criar nova
print("\n🏢 Verificando empresa VMAX...")
try:
    existing_company = supabase.table("companies").select("*").eq("cnpj", company_data["cnpj"]).execute()
    
    if existing_company.data and len(existing_company.data) > 0:
        company_id = existing_company.data[0]["id"]
        print(f"✅ Empresa já existe! ID: {company_id}")
    else:
        result = supabase.table("companies").insert(company_data).execute()
        company_id = result.data[0]["id"]
        print(f"✅ Empresa criada com sucesso! ID: {company_id}")
except Exception as e:
    print(f"❌ ERRO ao processar empresa: {e}")
    exit(1)

# Dados dos clientes (embutidos no código)
clientes_data = [
    {"nome": "ADRIANA APARECIDA GONCALVES", "cpf_cnpj": "304.026.948-01", "telefone": "11 97337-0000", "email": "", "valor_total": 1089.00, "vencimento": "2024-10-15"},
    {"nome": "ADRIANA APARECIDA GONCALVES", "cpf_cnpj": "304.026.948-01", "telefone": "11 97337-0000", "email": "", "valor_total": 1089.00, "vencimento": "2024-11-15"},
    {"nome": "ADRIANA APARECIDA GONCALVES", "cpf_cnpj": "304.026.948-01", "telefone": "11 97337-0000", "email": "", "valor_total": 1089.00, "vencimento": "2024-12-15"},
    {"nome": "ADRIANA APARECIDA GONCALVES", "cpf_cnpj": "304.026.948-01", "telefone": "11 97337-0000", "email": "", "valor_total": 1089.00, "vencimento": "2025-01-15"},
    {"nome": "ADRIANA APARECIDA GONCALVES", "cpf_cnpj": "304.026.948-01", "telefone": "11 97337-0000", "email": "", "valor_total": 1089.00, "vencimento": "2025-02-15"},
    {"nome": "ADRIANA APARECIDA GONCALVES", "cpf_cnpj": "304.026.948-01", "telefone": "11 97337-0000", "email": "", "valor_total": 1089.00, "vencimento": "2025-03-15"},
    {"nome": "ADRIANA APARECIDA GONCALVES", "cpf_cnpj": "304.026.948-01", "telefone": "11 97337-0000", "email": "", "valor_total": 1089.00, "vencimento": "2025-04-15"},
    {"nome": "ADRIANA APARECIDA GONCALVES", "cpf_cnpj": "304.026.948-01", "telefone": "11 97337-0000", "email": "", "valor_total": 1089.00, "vencimento": "2025-05-15"},
    {"nome": "ADRIANA APARECIDA GONCALVES", "cpf_cnpj": "304.026.948-01", "telefone": "11 97337-0000", "email": "", "valor_total": 1089.00, "vencimento": "2025-06-15"},
    {"nome": "ADRIANA APARECIDA GONCALVES", "cpf_cnpj": "304.026.948-01", "telefone": "11 97337-0000", "email": "", "valor_total": 1089.00, "vencimento": "2025-07-15"},
    {"nome": "ADRIANA APARECIDA GONCALVES", "cpf_cnpj": "304.026.948-01", "telefone": "11 97337-0000", "email": "", "valor_total": 1089.00, "vencimento": "2025-08-15"},
    {"nome": "ADRIANA APARECIDA GONCALVES", "cpf_cnpj": "304.026.948-01", "telefone": "11 97337-0000", "email": "", "valor_total": 1089.00, "vencimento": "2025-09-15"},
    {"nome": "ADRIANO JOSE GONCALVES", "cpf_cnpj": "304.026.948-01", "telefone": "11 97337-0000", "email": "", "valor_total": 1089.00, "vencimento": "2024-10-15"},
    {"nome": "ADRIANO JOSE GONCALVES", "cpf_cnpj": "304.026.948-01", "telefone": "11 97337-0000", "email": "", "valor_total": 1089.00, "vencimento": "2024-11-15"},
    {"nome": "ADRIANO JOSE GONCALVES", "cpf_cnpj": "304.026.948-01", "telefone": "11 97337-0000", "email": "", "valor_total": 1089.00, "vencimento": "2024-12-15"},
    {"nome": "ADRIANO JOSE GONCALVES", "cpf_cnpj": "304.026.948-01", "telefone": "11 97337-0000", "email": "", "valor_total": 1089.00, "vencimento": "2025-01-15"},
    {"nome": "ADRIANO JOSE GONCALVES", "cpf_cnpj": "304.026.948-01", "telefone": "11 97337-0000", "email": "", "valor_total": 1089.00, "vencimento": "2025-02-15"},
    {"nome": "ADRIANO JOSE GONCALVES", "cpf_cnpj": "304.026.948-01", "telefone": "11 97337-0000", "email": "", "valor_total": 1089.00, "vencimento": "2025-03-15"},
    {"nome": "ADRIANO JOSE GONCALVES", "cpf_cnpj": "304.026.948-01", "telefone": "11 97337-0000", "email": "", "valor_total": 1089.00, "vencimento": "2025-04-15"},
    {"nome": "ADRIANO JOSE GONCALVES", "cpf_cnpj": "304.026.948-01", "telefone": "11 97337-0000", "email": "", "valor_total": 1089.00, "vencimento": "2025-05-15"},
    {"nome": "ADRIANO JOSE GONCALVES", "cpf_cnpj": "304.026.948-01", "telefone": "11 97337-0000", "email": "", "valor_total": 1089.00, "vencimento": "2025-06-15"},
    {"nome": "ADRIANO JOSE GONCALVES", "cpf_cnpj": "304.026.948-01", "telefone": "11 97337-0000", "email": "", "valor_total": 1089.00, "vencimento": "2025-07-15"},
    {"nome": "ADRIANO JOSE GONCALVES", "cpf_cnpj": "304.026.948-01", "telefone": "11 97337-0000", "email": "", "valor_total": 1089.00, "vencimento": "2025-08-15"},
    {"nome": "ADRIANO JOSE GONCALVES", "cpf_cnpj": "304.026.948-01", "telefone": "11 97337-0000", "email": "", "valor_total": 1089.00, "vencimento": "2025-09-15"},
    {"nome": "ALEXANDRE JOSE GONCALVES", "cpf_cnpj": "304.026.948-01", "telefone": "11 97337-0000", "email": "", "valor_total": 1089.00, "vencimento": "2024-10-15"},
    {"nome": "ALEXANDRE JOSE GONCALVES", "cpf_cnpj": "304.026.948-01", "telefone": "11 97337-0000", "email": "", "valor_total": 1089.00, "vencimento": "2024-11-15"},
    {"nome": "ALEXANDRE JOSE GONCALVES", "cpf_cnpj": "304.026.948-01", "telefone": "11 97337-0000", "email": "", "valor_total": 1089.00, "vencimento": "2024-12-15"},
    {"nome": "ALEXANDRE JOSE GONCALVES", "cpf_cnpj": "304.026.948-01", "telefone": "11 97337-0000", "email": "", "valor_total": 1089.00, "vencimento": "2025-01-15"},
    {"nome": "ALEXANDRE JOSE GONCALVES", "cpf_cnpj": "304.026.948-01", "telefone": "11 97337-0000", "email": "", "valor_total": 1089.00, "vencimento": "2025-02-15"},
    {"nome": "ALEXANDRE JOSE GONCALVES", "cpf_cnpj": "304.026.948-01", "telefone": "11 97337-0000", "email": "", "valor_total": 1089.00, "vencimento": "2025-03-15"},
    {"nome": "ALEXANDRE JOSE GONCALVES", "cpf_cnpj": "304.026.948-01", "telefone": "11 97337-0000", "email": "", "valor_total": 1089.00, "vencimento": "2025-04-15"},
    {"nome": "ALEXANDRE JOSE GONCALVES", "cpf_cnpj": "304.026.948-01", "telefone": "11 97337-0000", "email": "", "valor_total": 1089.00, "vencimento": "2025-05-15"},
    {"nome": "ALEXANDRE JOSE GONCALVES", "cpf_cnpj": "304.026.948-01", "telefone": "11 97337-0000", "email": "", "valor_total": 1089.00, "vencimento": "2025-06-15"},
    {"nome": "ALEXANDRE JOSE GONCALVES", "cpf_cnpj": "304.026.948-01", "telefone": "11 97337-0000", "email": "", "valor_total": 1089.00, "vencimento": "2025-07-15"},
    {"nome": "ALEXANDRE JOSE GONCALVES", "cpf_cnpj": "304.026.948-01", "telefone": "11 97337-0000", "email": "", "valor_total": 1089.00, "vencimento": "2025-08-15"},
    {"nome": "ALEXANDRE JOSE GONCALVES", "cpf_cnpj": "304.026.948-01", "telefone": "11 97337-0000", "email": "", "valor_total": 1089.00, "vencimento": "2025-09-15"},
    {"nome": "ALINE CRISTINA GONCALVES", "cpf_cnpj": "304.026.948-01", "telefone": "11 97337-0000", "email": "", "valor_total": 1089.00, "vencimento": "2024-10-15"},
    {"nome": "ALINE CRISTINA GONCALVES", "cpf_cnpj": "304.026.948-01", "telefone": "11 97337-0000", "email": "", "valor_total": 1089.00, "vencimento": "2024-11-15"},
    {"nome": "ALINE CRISTINA GONCALVES", "cpf_cnpj": "304.026.948-01", "telefone": "11 97337-0000", "email": "", "valor_total": 1089.00, "vencimento": "2024-12-15"},
    {"nome": "ALINE CRISTINA GONCALVES", "cpf_cnpj": "304.026.948-01", "telefone": "11 97337-0000", "email": "", "valor_total": 1089.00, "vencimento": "2025-01-15"},
]

print(f"\n👥 Processando {len(clientes_data)} registros de clientes e dívidas...")

# Agrupar por cliente
clientes_agrupados = {}
for row in clientes_data:
    cpf_cnpj = row["cpf_cnpj"]
    if cpf_cnpj not in clientes_agrupados:
        clientes_agrupados[cpf_cnpj] = {
            "nome": row["nome"],
            "telefone": row["telefone"],
            "email": row["email"],
            "dividas": []
        }
    
    clientes_agrupados[cpf_cnpj]["dividas"].append({
        "valor": row["valor_total"],
        "vencimento": row["vencimento"]
    })

clientes_criados = 0
dividas_criadas = 0
erros = 0

for cpf_cnpj, dados in clientes_agrupados.items():
    try:
        # Verificar se cliente já existe
        existing_client = supabase.table("clients").select("*").eq("cpf_cnpj", cpf_cnpj).eq("company_id", company_id).execute()
        
        if existing_client.data and len(existing_client.data) > 0:
            client_id = existing_client.data[0]["id"]
            print(f"   ℹ️  Cliente {dados['nome']} já existe")
        else:
            # Criar cliente
            client_data = {
                "company_id": company_id,
                "name": dados["nome"],
                "cpf_cnpj": cpf_cnpj,
                "phone": dados["telefone"],
                "email": dados["email"] if dados["email"] else None,
                "status": "active"
            }
            
            result = supabase.table("clients").insert(client_data).execute()
            client_id = result.data[0]["id"]
            clientes_criados += 1
            print(f"   ✅ Cliente criado: {dados['nome']}")
        
        # Criar dívidas
        for divida in dados["dividas"]:
            debt_data = {
                "client_id": client_id,
                "company_id": company_id,
                "original_amount": divida["valor"],
                "current_amount": divida["valor"],
                "due_date": divida["vencimento"],
                "status": "pending",
                "description": f"Fatura vencimento {divida['vencimento']}"
            }
            
            supabase.table("debts").insert(debt_data).execute()
            dividas_criadas += 1
            
    except Exception as e:
        erros += 1
        print(f"   ❌ Erro ao processar {dados['nome']}: {e}")

print("\n" + "=" * 80)
print("✅ IMPORTAÇÃO CONCLUÍDA!")
print("=" * 80)
print(f"📊 Resumo:")
print(f"   • Clientes criados: {clientes_criados}")
print(f"   • Dívidas criadas: {dividas_criadas}")
print(f"   • Erros: {erros}")
print("=" * 80)
