"use client"

import type React from "react"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Upload, FileText, AlertTriangle, X, Download, Eye, RefreshCw } from "lucide-react"

interface ImportRecord {
  id: string
  filename: string
  fileType: string
  totalRecords: number
  successfulRecords: number
  failedRecords: number
  status: "processing" | "completed" | "failed"
  createdAt: string
  errorLog?: any[]
}

export default function ImportPage() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [previewData, setPreviewData] = useState<any[]>([])
  const [showPreview, setShowPreview] = useState(false)

  // Mock data for import history
  const importHistory: ImportRecord[] = [
    {
      id: "1",
      filename: "clientes_janeiro_2025.csv",
      fileType: "CSV",
      totalRecords: 1250,
      successfulRecords: 1247,
      failedRecords: 3,
      status: "completed",
      createdAt: "2025-01-15T10:30:00Z",
    },
    {
      id: "2",
      filename: "dividas_dezembro_2024.xlsx",
      fileType: "XLSX",
      totalRecords: 890,
      successfulRecords: 890,
      failedRecords: 0,
      status: "completed",
      createdAt: "2025-01-10T14:20:00Z",
    },
    {
      id: "3",
      filename: "dados_sistema_antigo.json",
      fileType: "JSON",
      totalRecords: 2340,
      successfulRecords: 0,
      failedRecords: 2340,
      status: "failed",
      createdAt: "2025-01-08T09:15:00Z",
      errorLog: [
        { line: 1, error: "Campo 'email' obrigatório não encontrado" },
        { line: 5, error: "Formato de data inválido" },
        { line: 12, error: "CPF/CNPJ inválido" },
      ],
    },
  ]

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      setSelectedFile(file)
      // Simulate file preview
      if (file.type === "text/csv" || file.name.endsWith(".csv")) {
        setPreviewData([
          { nome: "João Silva", email: "joao@email.com", cpf: "123.456.789-00", valor: "R$ 1.250,00" },
          { nome: "Maria Santos", email: "maria@email.com", cpf: "987.654.321-00", valor: "R$ 890,50" },
          { nome: "Pedro Costa", email: "pedro@email.com", cpf: "456.789.123-00", valor: "R$ 2.100,00" },
        ])
        setShowPreview(true)
      }
    }
  }

  const handleUpload = async () => {
    if (!selectedFile) return

    setIsUploading(true)
    setUploadProgress(0)

    // Simulate upload progress
    const interval = setInterval(() => {
      setUploadProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval)
          setIsUploading(false)
          setSelectedFile(null)
          setShowPreview(false)
          return 100
        }
        return prev + 10
      })
    }, 200)
  }

  const getStatusBadge = (status: ImportRecord["status"]) => {
    switch (status) {
      case "completed":
        return <Badge className="bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400">Concluído</Badge>
      case "processing":
        return <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400">Processando</Badge>
      case "failed":
        return <Badge className="bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400">Falhou</Badge>
    }
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Importar Dados</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Importe clientes e dívidas de arquivos CSV, XLSX, JSON ou XML
          </p>
        </div>
      </div>

      <Tabs defaultValue="upload" className="space-y-6">
        <TabsList>
          <TabsTrigger value="upload">Nova Importação</TabsTrigger>
          <TabsTrigger value="history">Histórico</TabsTrigger>
          <TabsTrigger value="templates">Modelos</TabsTrigger>
        </TabsList>

        <TabsContent value="upload" className="space-y-6">
          {/* Upload Section */}
          <Card>
            <CardHeader>
              <CardTitle>Selecionar Arquivo</CardTitle>
              <CardDescription>Formatos suportados: CSV, XLSX, JSON, XML. Tamanho máximo: 10MB</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-8 text-center">
                  <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                  <div className="space-y-2">
                    <Label htmlFor="file-upload" className="cursor-pointer">
                      <span className="text-blue-600 hover:text-blue-700 font-medium">Clique para selecionar</span>
                      <span className="text-gray-600 dark:text-gray-400"> ou arraste o arquivo aqui</span>
                    </Label>
                    <Input
                      id="file-upload"
                      type="file"
                      accept=".csv,.xlsx,.json,.xml"
                      onChange={handleFileSelect}
                      className="hidden"
                    />
                    <p className="text-sm text-gray-500 dark:text-gray-400">CSV, XLSX, JSON ou XML até 10MB</p>
                  </div>
                </div>

                {selectedFile && (
                  <Alert>
                    <FileText className="h-4 w-4" />
                    <AlertDescription>
                      <div className="flex items-center justify-between">
                        <div>
                          <strong>{selectedFile.name}</strong>
                          <span className="text-sm text-gray-500 ml-2">
                            ({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)
                          </span>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSelectedFile(null)
                            setShowPreview(false)
                          }}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </AlertDescription>
                  </Alert>
                )}

                {isUploading && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span>Processando arquivo...</span>
                      <span>{uploadProgress}%</span>
                    </div>
                    <Progress value={uploadProgress} />
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Preview Section */}
          {showPreview && previewData.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Prévia dos Dados</CardTitle>
                <CardDescription>
                  Primeiras 3 linhas do arquivo. Verifique se os dados estão corretos antes de importar.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        {Object.keys(previewData[0] || {}).map((key) => (
                          <TableHead key={key} className="capitalize">
                            {key}
                          </TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {previewData.map((row, index) => (
                        <TableRow key={index}>
                          {Object.values(row).map((value, cellIndex) => (
                            <TableCell key={cellIndex}>{value as string}</TableCell>
                          ))}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                <div className="flex justify-end space-x-3 mt-4">
                  <Button variant="outline" onClick={() => setShowPreview(false)}>
                    Cancelar
                  </Button>
                  <Button onClick={handleUpload} disabled={isUploading}>
                    {isUploading ? (
                      <>
                        <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                        Processando...
                      </>
                    ) : (
                      <>
                        <Upload className="mr-2 h-4 w-4" />
                        Importar Dados
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="history" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Histórico de Importações</CardTitle>
              <CardDescription>Todas as importações realizadas no sistema</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Arquivo</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Registros</TableHead>
                      <TableHead>Sucesso</TableHead>
                      <TableHead>Falhas</TableHead>
                      <TableHead>Data</TableHead>
                      <TableHead>Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {importHistory.map((record) => (
                      <TableRow key={record.id}>
                        <TableCell className="font-medium">{record.filename}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{record.fileType}</Badge>
                        </TableCell>
                        <TableCell>{getStatusBadge(record.status)}</TableCell>
                        <TableCell>{record.totalRecords.toLocaleString()}</TableCell>
                        <TableCell className="text-green-600 dark:text-green-400">
                          {record.successfulRecords.toLocaleString()}
                        </TableCell>
                        <TableCell className="text-red-600 dark:text-red-400">
                          {record.failedRecords.toLocaleString()}
                        </TableCell>
                        <TableCell>{new Date(record.createdAt).toLocaleDateString("pt-BR")}</TableCell>
                        <TableCell>
                          <div className="flex space-x-2">
                            <Button variant="ghost" size="sm">
                              <Eye className="h-4 w-4" />
                            </Button>
                            {record.failedRecords > 0 && (
                              <Button variant="ghost" size="sm">
                                <Download className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="templates" className="space-y-6">
          <div className="grid md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Modelo de Clientes</CardTitle>
                <CardDescription>Template para importação de dados de clientes</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                    <h4 className="font-medium mb-2">Campos obrigatórios:</h4>
                    <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                      <li>• nome (texto)</li>
                      <li>• email (email válido)</li>
                      <li>• documento (CPF/CNPJ)</li>
                    </ul>
                  </div>
                  <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                    <h4 className="font-medium mb-2">Campos opcionais:</h4>
                    <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                      <li>• telefone</li>
                      <li>• endereco</li>
                      <li>• cidade</li>
                      <li>• estado</li>
                      <li>• cep</li>
                    </ul>
                  </div>
                  <Button className="w-full">
                    <Download className="mr-2 h-4 w-4" />
                    Baixar Modelo CSV
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Modelo de Dívidas</CardTitle>
                <CardDescription>Template para importação de dados de dívidas</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                    <h4 className="font-medium mb-2">Campos obrigatórios:</h4>
                    <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                      <li>• cliente_documento (CPF/CNPJ)</li>
                      <li>• valor_original (decimal)</li>
                      <li>• valor_atual (decimal)</li>
                      <li>• data_vencimento (YYYY-MM-DD)</li>
                    </ul>
                  </div>
                  <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                    <h4 className="font-medium mb-2">Campos opcionais:</h4>
                    <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                      <li>• numero_contrato</li>
                      <li>• descricao</li>
                      <li>• status</li>
                    </ul>
                  </div>
                  <Button className="w-full">
                    <Download className="mr-2 h-4 w-4" />
                    Baixar Modelo CSV
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <strong>Importante:</strong> Certifique-se de que os dados estejam no formato correto antes de importar.
              Arquivos com erros de formato podem causar falhas na importação.
            </AlertDescription>
          </Alert>
        </TabsContent>
      </Tabs>
    </div>
  )
}
