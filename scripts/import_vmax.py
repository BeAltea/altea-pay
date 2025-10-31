#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import os
import json
import urllib.request
import urllib.error
from datetime import datetime

# Configuracao do Supabase
SUPABASE_URL = os.environ.get('SUPABASE_URL')
SUPABASE_KEY = os.environ.get('SUPABASE_SERVICE_ROLE_KEY')

if not SUPABASE_URL or not SUPABASE_KEY:
    print("ERRO: Variaveis de ambiente nao encontradas")
    exit(1)

def make_request(endpoint, method='GET', data=None):
    url = f"{SUPABASE_URL}/rest/v1/{endpoint}"
    headers = {
        'apikey': SUPABASE_KEY,
        'Authorization': f'Bearer {SUPABASE_KEY}',
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
    }
    
    if data:
        data = json.dumps(data).encode('utf-8')
    
    req = urllib.request.Request(url, data=data, headers=headers, method=method)
    
    try:
        with urllib.request.urlopen(req) as response:
            return json.loads(response.read().decode('utf-8'))
    except urllib.error.HTTPError as e:
        error_body = e.read().decode('utf-8')
        print(f"ERRO HTTP {e.code}: {error_body}")
        return None
    except Exception as e:
        print(f"ERRO: {str(e)}")
        return None

def parse_date(date_str):
    if not date_str or date_str.strip() == '':
        return None
    try:
        parts = date_str.split('/')
        return f"{parts[2]}-{parts[1]}-{parts[0]}"
    except:
        return None

def parse_value(value_str):
    try:
        return float(value_str.replace(',', '.'))
    except:
        return 0.0

# Dados dos clientes
clientes_data = [
    ["26.205.356/0001-55", "26.205.356 Gregory Marques Dias Campos Batista", "259,8", "25/06/2025", "103", "Itatiba", ""],
    ["40.597.164/0001-62", "40.597.164 Alexandro De Jesus Ramos Me", "193,36", "15/09/2024", "386", "Bom Jesus Dos Perdoes", "26/12/2024"],
    ["49.241.873/0001-85", "49.241.873 Andre Aparecido De Souza Me", "1727,09", "25/07/2024", "438", "Itatiba", "16/08/2024"],
    ["50.764.496/0001-48", "50.764.496 Daniela Paes De Oliveira", "359,8", "15/02/2025", "233", "Itatiba", "30/06/2025"],
    ["54.172.738/0001-65", "54 172 738 Marina Francisco Dos Santos Me", "299,8", "05/03/2025", "215", "Bom Jesus Dos Perdoes", "30/06/2025"],
    ["56.079.522/0001-85", "56.079.522 Naiara Cristina Goncalves Dos Santos Me", "653,7", "10/09/2024", "391", "Itatiba", "28/01/2025"],
    ["56.120.291/0001-06", "56.120.291 Otavio Soares De Sousa Me", "299,8", "10/10/2024", "361", "Itatiba", "28/01/2025"],
    ["018.204.624-98", "Abimael Gomes De Souza", "143,19", "10/10/2023", "727", "Itatiba", "25/10/2023"],
    ["297.776.978-13", "Adailton De Oliveira Souza", "214", "20/04/2023", "900", "Itatiba", "30/11/2020"],
    ["421.619.718-32", "Adam Santos De Morais", "199,8", "20/07/2025", "78", "Itatiba", ""],
    ["234.915.678-82", "Adao De Oliveira Correa", "279,8", "10/06/2024", "483", "Piracaia", "27/08/2024"],
    ["393.857.688-08", "Adeidiane Da Silva", "219,8", "15/07/2025", "83", "Piracaia", ""],
    ["065.787.005-60", "Adeilton Silva Dos Santos", "1157,22", "10/07/2024", "453", "Itatiba", "20/09/2024"],
    ["385.619.588-20", "Ademilson Israel Justino De Souza", "79,85", "20/03/2023", "931", "Itatiba", "18/07/2023"],
    ["305.210.128-56", "Adenilson Cardoso Eduardo", "215,8", "15/07/2025", "83", "Louveira", ""],
    ["104.738.446-99", "Adeylton Goncalves De Resende Macedo", "773,8", "05/11/2024", "335", "Itatiba", "11/11/2022"],
    ["228.760.748-00", "Adilson Da Silva Walter", "119,9", "10/05/2023", "880", "Itatiba", "07/08/2023"],
    ["317.998.228-42", "Adilson Domingues", "279,82", "10/01/2024", "635", "Atibaia", "24/02/2024"],
    ["269.399.188-92", "Adilson Pereira", "199,8", "10/04/2024", "544", "Itatiba", "26/06/2024"],
    ["080.231.218-71", "Adilson Rezende", "453,6", "10/04/2023", "910", "Itatiba", "17/07/2023"],
    ["139.135.424-93", "Adjailson Pedro De Lima Costa", "279,8", "10/12/2024", "300", "Itatiba", "31/03/2025"],
    ["093.319.255-06", "Admilson  Goncalves Da Costa", "290,12", "10/10/2024", "361", "Itatiba", "28/01/2025"],
    ["215.924.968-81", "Admilson Oliveira Franco", "199,8", "10/12/2024", "300", "Itatiba", "31/03/2025"],
    ["271.410.978-05", "Adriana Aparecida De Lima Gomes", "279,8", "10/07/2023", "819", "Itatiba", "06/11/2023"],
    ["324.142.838-90", "Adriana Aparecida Fagundes", "99,9", "10/11/2023", "696", "Itatiba", "13/11/2023"],
    ["402.568.628-77", "Adriana Batista", "493,01", "10/12/2024", "300", "Itatiba", "26/11/2023"],
    ["268.034.878-81", "Adriana Batista De Souza", "319,7", "20/07/2023", "809", "Campinas", "28/02/2023"],
    ["268.034.878-81", "Adriana Batista De Souza", "462,96", "20/06/2024", "473", "Campinas", "13/12/2023"],
    ["266.670.088-75", "Adriana Cavalcante De Araujo Santos", "358,81", "20/06/2023", "839", "Itatiba", "20/09/2023"],
    ["501.687.138-88", "Adriana Cristina De Souza", "854,58", "10/09/2023", "757", "Itatiba", "08/01/2024"],
    ["175.959.548-94", "Adriana Cristina De Souza Martins", "199,8", "20/04/2025", "169", "Itatiba", "26/06/2024"],
    ["304.523.728-28", "Adriana De Carvalho Cilli", "280,76", "20/02/2025", "228", "Nazare Paulista", "01/04/2025"],
    ["016.932.732-92", "Adriana De Cassia Sousa Da Paixao", "95,53", "10/07/2025", "88", "Louveira", "11/07/2025"],
    ["178.960.558-05", "Adriana De Oliveira", "778,4", "10/08/2023", "788", "Nazare Paulista", "13/12/2023"],
    ["460.655.968-33", "Adriana De Souza Legrazie De Faria", "239,8", "10/07/2024", "453", "Itatiba", "25/09/2024"],
    ["288.165.478-98", "Adriana Luchini Aleixo", "37,72", "10/04/2025", "179", "Piracaia", "18/03/2025"],
    ["178.944.698-82", "Adriana Maria Pinto De Oliveira", "55", "10/03/2023", "941", "Nazare Paulista", "16/06/2023"],
    ["614.310.373-97", "Adriana Martins Da Silva", "424,8", "30/08/2023", "768", "Bom Jesus Dos Perdoes", "28/02/2023"],
    ["271.088.178-02", "Adriana Silveira", "185,8", "31/07/2024", "432", "Itatiba", "29/10/2024"],
    ["861.927.115-69", "Adriane Gonzaga Da Exaltacao", "199,8", "10/10/2024", "361", "Itatiba", "28/01/2025"]
]

print("=" * 80)
print("INICIANDO IMPORTACAO DA EMPRESA VMAX")
print("=" * 80)

# Buscar empresa VMAX
print("\n1. Buscando empresa VMAX...")
company = make_request('companies?cnpj=eq.07.685.452/0001-01&select=*')
if not company or len(company) == 0:
    print("ERRO: Empresa VMAX nao encontrada no banco")
    exit(1)

company_id = company[0]['id']
print(f"OK - Empresa encontrada: {company_id}")

# Processar clientes
print(f"\n2. Processando {len(clientes_data)} clientes...")
success_count = 0
error_count = 0

for idx, cliente_info in enumerate(clientes_data, 1):
    cpf_cnpj = cliente_info[0]
    nome = cliente_info[1]
    valor = parse_value(cliente_info[2])
    primeira_vencida = parse_date(cliente_info[3])
    dias_inad = int(cliente_info[4])
    cidade = cliente_info[5]
    dt_cancelamento = parse_date(cliente_info[6])
    
    print(f"\n[{idx}/40] {nome[:40]}...")
    
    # Criar cliente
    cliente_data = {
        'company_id': company_id,
        'name': nome,
        'cpf_cnpj': cpf_cnpj,
        'phone': '',
        'email': '',
        'address': cidade,
        'status': 'active'
    }
    
    cliente = make_request('clients', 'POST', cliente_data)
    if not cliente:
        print(f"  ERRO ao criar cliente")
        error_count += 1
        continue
    
    client_id = cliente[0]['id']
    print(f"  Cliente criado: {client_id}")
    
    # Criar divida
    divida_data = {
        'client_id': client_id,
        'company_id': company_id,
        'amount': valor,
        'due_date': primeira_vencida,
        'status': 'pending',
        'description': f'Divida vencida - {dias_inad} dias'
    }
    
    divida = make_request('debts', 'POST', divida_data)
    if divida:
        print(f"  Divida criada: R$ {valor}")
        success_count += 1
    else:
        print(f"  ERRO ao criar divida")
        error_count += 1

print("\n" + "=" * 80)
print("IMPORTACAO CONCLUIDA")
print("=" * 80)
print(f"Sucesso: {success_count}")
print(f"Erros: {error_count}")
print("=" * 80)
