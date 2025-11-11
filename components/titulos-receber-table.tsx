"use client"

import { useState, useEffect } from "react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Download, Search } from "lucide-react"
import { format } from "date-fns"
import { toast } from "sonner"

interface Titulo {
  nroTitulo: string
  parceiro: string
  codParceiro: string
  valor: number
  dataVencimento: string
  dataNegociacao: string
  status: "Aberto" | "Baixado"
  tipoFinanceiro: "Real" | "Provisão"
  tipoTitulo: string
  contaBancaria?: string
  historico?: string
  numeroParcela: number
  origemFinanceiro: string
  codigoEmpresa: number
  codigoNatureza: number
  boleto: {
    codigoBarras: string | null
    nossoNumero: string | null
    linhaDigitavel: string | null
    numeroRemessa: string | null
  }
}

interface Partner {
  CODPARC: string
  NOMEPARC: string
  CGC_CPF: string
  RAZAOSOCIAL?: string // Adicionado para compatibilidade com buscarParceiros
}

export default function TitulosReceberTable() {
  const [titulos, setTitulos] = useState<Titulo[]>([])
  const [loading, setLoading] = useState(false)
  const [showDetalhes, setShowDetalhes] = useState(false)
  const [selectedTitulo, setSelectedTitulo] = useState<Titulo | null>(null)

  // Filtros
  const [parceiroSelecionado, setParceiroSelecionado] = useState<string>("")
  const [dataNegociacaoInicio, setDataNegociacaoInicio] = useState<string>("")
  const [dataNegociacaoFinal, setDataNegociacaoFinal] = useState<string>("")
  const [tipoFinanceiro, setTipoFinanceiro] = useState<string>("3") // 1=Pendente, 2=Baixado, 3=Todos
  const [statusFinanceiro, setStatusFinanceiro] = useState<string>("3") // 1=Real, 2=Provisão, 3=Todos

  // Busca de parceiros
  const [parceiros, setParceiros] = useState<Partner[]>([])
  const [partnerSearch, setPartnerSearch] = useState("")
  const [isLoadingPartners, setIsLoadingPartners] = useState(false)
  const [allParceiros, setAllParceiros] = useState<Partner[]>([])
  
  // Métricas dos totais
  const [metricas, setMetricas] = useState({
    real: 0,
    provisao: 0,
    aberto: 0,
    baixado: 0,
    valorReal: 0,
    valorProvisao: 0,
    valorAberto: 0,
    valorBaixado: 0
  })

  // Carrega parceiros do cache
  useEffect(() => {
    const loadPartners = async () => {
      try {
        // Buscar do cache local
        const cachedParceiros = sessionStorage.getItem('cached_parceiros')
        if (cachedParceiros) {
          try {
            const parsedCache = JSON.parse(cachedParceiros)

            // O cache pode ter a estrutura { parceiros: [...] } ou ser um array direto
            const allParceirosData = parsedCache.parceiros || parsedCache
            if (Array.isArray(allParceirosData)) {
              setAllParceiros(allParceirosData) // Armazena todos os parceiros
              setParceiros(allParceirosData) // Inicialmente, exibe todos os parceiros
              console.log('✅ Parceiros do cache (Financeiro):', allParceirosData.length)
            } else {
              setAllParceiros([])
              setParceiros([])
            }
            return
          } catch (e) {
            console.error('Erro ao parsear cache:', e)
            sessionStorage.removeItem('cached_parceiros')
            setAllParceiros([])
            setParceiros([])
          }
        }

        console.warn('⚠️ Cache de parceiros vazio')
        setAllParceiros([])
        setParceiros([])
      } catch (error) {
        console.error('Erro ao carregar parceiros:', error)
        setAllParceiros([])
        setParceiros([])
      }
    }
    loadPartners();
  }, [])


  const handlePartnerSearch = (value: string) => {
    setPartnerSearch(value)
    setParceiroSelecionado("") // Limpar seleção ao digitar

    // Precisa de pelo menos 2 caracteres
    if (value.length < 2) {
      setParceiros([])
      return
    }

    try {
      const searchLower = value.toLowerCase()
      const filtered = allParceiros.filter((p: any) =>
        p.NOMEPARC?.toLowerCase().includes(searchLower) ||
        p.CGC_CPF?.includes(value) ||
        p.RAZAOSOCIAL?.toLowerCase().includes(searchLower) ||
        p.CODPARC?.toString().includes(value)
      )
      setParceiros(filtered)
      console.log('✅ Parceiros filtrados (Financeiro):', filtered.length, 'de', allParceiros.length)
    } catch (error) {
      console.error('Erro ao filtrar parceiros:', error)
      setParceiros([])
    }
  }

  const handlePartnerSelect = (value: string) => {
    setParceiroSelecionado(value)
    // Encontrar o parceiro selecionado para mostrar o nome
    const partner = parceiros.find(p => p.CODPARC === value)
    if (partner) {
      setPartnerSearch(partner.NOMEPARC)
      setParceiros([]) // Fechar dropdown
    }
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value)
  }

  const formatDate = (dateString: string) => {
    if (!dateString) return '-'
    try {
      const [year, month, day] = dateString.split('-')
      return `${day}/${month}/${year}`
    } catch {
      return dateString
    }
  }

  const getStatusColor = (status: string) => {
    return status === "Aberto" ? "bg-yellow-100 text-yellow-800" : "bg-green-100 text-green-800"
  }

  const getTipoFinanceiroColor = (tipo: string) => {
    return tipo === "Real" ? "bg-blue-100 text-blue-800" : "bg-purple-100 text-purple-800"
  }

  const baixarBoleto = async (titulo: Titulo) => {
    try {
      const response = await fetch(`/api/sankhya/boleto/${titulo.nroTitulo}`)

      if (!response.ok) throw new Error('Erro ao baixar boleto')

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `boleto_${titulo.nroTitulo}.pdf`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)

      toast.success("Boleto baixado com sucesso!")
    } catch (error) {
      console.error('Erro ao baixar boleto:', error)
      toast.error('Erro ao baixar boleto. Tente novamente.')
    }
  }

  const abrirDetalhes = (titulo: Titulo) => {
    setSelectedTitulo(titulo)
    setShowDetalhes(true)
  }

  // Função para carregar os títulos, agora sem buscar parceiros novamente
  const carregarTitulos = async () => {
    if (!parceiroSelecionado) {
      toast.error("Selecione um parceiro para buscar os títulos")
      return
    }

    setLoading(true)
    try {
      const params = new URLSearchParams({
        codParceiro: parceiroSelecionado,
        tipoFinanceiro,
        statusFinanceiro,
      })

      if (dataNegociacaoInicio) params.append('dataNegociacaoInicio', dataNegociacaoInicio)
      if (dataNegociacaoFinal) params.append('dataNegociacaoFinal', dataNegociacaoFinal)

      // Usar o endpoint correto que busca dados do Oracle
      const response = await fetch(`/api/sankhya/titulos-receber?${params}`)
      if (!response.ok) {
        const errorData = await response.json()
        console.error('❌ Erro ao carregar títulos:', errorData)
        throw new Error(errorData.error || 'Erro ao carregar títulos')
      }

      const data = await response.json()

      // Garantir que o valor seja um número e tratar NaN
      const formattedData = data.titulos.map((titulo: Titulo) => ({
        ...titulo,
        valor: typeof titulo.valor === 'number' ? titulo.valor : parseFloat(titulo.valor.toString().replace(',', '.')) || 0,
      }))

      setTitulos(formattedData)
      
      // Atualizar métricas
      if (data.totais) {
        setMetricas(data.totais)
      }

      if (formattedData.length > 0) {
        toast.success(`${formattedData.length} título(s) encontrado(s)`)
      } else {
        toast.info("Nenhum título encontrado")
      }
    } catch (error) {
      console.error('Erro ao carregar títulos:', error)
      toast.error('Erro ao carregar títulos. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-2xl font-bold text-foreground">Financeiro</CardTitle>
              <CardDescription className="text-sm text-muted-foreground">Consulta e gerenciamento de títulos a receber</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Filtros de Busca */}
          <div className="bg-white border rounded-lg p-3 md:p-4 space-y-3 md:space-y-4">
            <div className="flex items-center justify-between mb-2 md:mb-3">
              <h3 className="text-sm font-semibold text-gray-700">Filtros de Busca</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-3 md:gap-4">
              {/* Parceiro */}
              <div className="space-y-1.5 md:space-y-2 lg:col-span-2">
                <Label htmlFor="parceiro" className="text-xs md:text-sm font-medium">Parceiro *</Label>
                <div className="relative">
                  <Input
                    id="parceiro"
                    type="text"
                    placeholder="Digite pelo menos 2 caracteres..."
                    value={partnerSearch}
                    onChange={(e) => handlePartnerSearch(e.target.value)}
                    className="w-full h-9 md:h-10"
                  />
                  {partnerSearch.length >= 2 && !parceiroSelecionado && (
                    <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-auto">
                      {isLoadingPartners ? (
                        <div className="p-3 text-sm text-center text-muted-foreground">Carregando...</div>
                      ) : parceiros.length > 0 ? (
                        parceiros.map((partner) => (
                          <div
                            key={partner.CODPARC}
                            onClick={() => handlePartnerSelect(partner.CODPARC)}
                            className="p-2 hover:bg-gray-100 cursor-pointer text-sm border-b last:border-b-0"
                          >
                            <div className="font-medium">{partner.NOMEPARC}</div>
                            <div className="text-xs text-muted-foreground">{partner.CGC_CPF}</div>
                          </div>
                        ))
                      ) : (
                        <div className="p-3 text-sm text-center text-muted-foreground">Nenhum parceiro encontrado</div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Data Início */}
              <div className="space-y-1.5 md:space-y-2">
                <Label htmlFor="dataInicio" className="text-xs md:text-sm font-medium">Data Início</Label>
                <Input
                  id="dataInicio"
                  type="date"
                  value={dataNegociacaoInicio}
                  onChange={(e) => setDataNegociacaoInicio(e.target.value)}
                  className="w-full h-9 md:h-10"
                />
              </div>

              {/* Data Fim */}
              <div className="space-y-1.5 md:space-y-2">
                <Label htmlFor="dataFim" className="text-xs md:text-sm font-medium">Data Fim</Label>
                <Input
                  id="dataFim"
                  type="date"
                  value={dataNegociacaoFinal}
                  onChange={(e) => setDataNegociacaoFinal(e.target.value)}
                  className="w-full h-9 md:h-10"
                />
              </div>

              {/* Tipo: Real ou Provisão */}
              <div className="space-y-1.5 md:space-y-2">
                <Label htmlFor="statusFinanceiro" className="text-xs md:text-sm font-medium">Tipo</Label>
                <Select
                  value={statusFinanceiro}
                  onValueChange={setStatusFinanceiro}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="3">Todos</SelectItem>
                    <SelectItem value="1">Real</SelectItem>
                    <SelectItem value="2">Provisão</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Botão de Buscar */}
              <div className="space-y-1.5 md:space-y-2">
                <Label className="text-xs md:text-sm font-medium opacity-0 hidden md:block">Ação</Label>
                <Button
                  onClick={carregarTitulos}
                  disabled={!parceiroSelecionado || loading}
                  className="w-full h-9 md:h-10 text-sm"
                >
                  <Search className="w-4 h-4 mr-2" />
                  {loading ? 'Buscando...' : 'Buscar Títulos'}
                </Button>
              </div>
            </div>
          </div>

          {/* Cards de Métricas */}
          {titulos.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardDescription className="text-xs">Real</CardDescription>
                  <CardTitle className="text-2xl text-blue-600">{metricas.real}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm font-semibold">{formatCurrency(metricas.valorReal)}</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardDescription className="text-xs">Provisão</CardDescription>
                  <CardTitle className="text-2xl text-purple-600">{metricas.provisao}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm font-semibold">{formatCurrency(metricas.valorProvisao)}</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardDescription className="text-xs">Aberto</CardDescription>
                  <CardTitle className="text-2xl text-yellow-600">{metricas.aberto}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm font-semibold">{formatCurrency(metricas.valorAberto)}</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardDescription className="text-xs">Baixado</CardDescription>
                  <CardTitle className="text-2xl text-green-600">{metricas.baixado}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm font-semibold">{formatCurrency(metricas.valorBaixado)}</p>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Tabela de Títulos */}
          <div className="border rounded-lg overflow-hidden">
            <div className="overflow-y-auto max-h-[600px]">
              <table className="w-full">
                <thead className="sticky top-0 z-10" style={{ backgroundColor: 'rgb(35, 55, 79)' }}>
                  <tr>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-white uppercase tracking-wider whitespace-nowrap">Nº Título</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-white uppercase tracking-wider whitespace-nowrap">Parceiro</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-white uppercase tracking-wider whitespace-nowrap">Valor</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-white uppercase tracking-wider whitespace-nowrap">Vencimento</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-white uppercase tracking-wider whitespace-nowrap">Negociação</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-white uppercase tracking-wider whitespace-nowrap">Tipo</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {loading ? (
                    <tr>
                      <td colSpan={7} className="px-6 py-8 text-center text-sm text-muted-foreground">
                        Carregando títulos...
                      </td>
                    </tr>
                  ) : titulos.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-6 py-8 text-center text-sm text-muted-foreground">
                        Nenhum título encontrado. Use os filtros acima para buscar.
                      </td>
                    </tr>
                  ) : (
                    titulos.map((titulo, index) => (
                    <tr key={`titulo-${titulo.nroTitulo}-${titulo.numeroParcela}-${index}`} className="hover:bg-muted/50 transition-colors">
                      <td className="px-6 py-4 text-sm font-medium text-foreground">{titulo.nroTitulo}</td>
                      <td className="px-6 py-4 text-sm text-foreground max-w-[200px] truncate">{titulo.parceiro}</td>
                      <td className="px-6 py-4 text-sm font-semibold text-foreground">{formatCurrency(titulo.valor)}</td>
                      <td className="px-6 py-4 text-sm text-foreground">{formatDate(titulo.dataVencimento)}</td>
                      <td className="px-6 py-4 text-sm text-foreground">{formatDate(titulo.dataNegociacao)}</td>
                      <td className="px-6 py-4 text-sm">
                        <Badge className={getTipoFinanceiroColor(titulo.tipoFinanceiro)}>
                          {titulo.tipoFinanceiro}
                        </Badge>
                      </td>
                    </tr>
                  ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Modal de Detalhes */}
      <Dialog open={showDetalhes} onOpenChange={setShowDetalhes}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Detalhes do Título</DialogTitle>
            <DialogDescription>
              Informações completas sobre o título selecionado
            </DialogDescription>
          </DialogHeader>

          {selectedTitulo && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs text-muted-foreground">Nº Título</Label>
                  <p className="font-semibold">{selectedTitulo.nroTitulo}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Tipo</Label>
                  <p className="font-semibold">{selectedTitulo.tipoTitulo}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Parceiro</Label>
                  <p className="font-semibold">{selectedTitulo.parceiro}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Código Parceiro</Label>
                  <p className="font-semibold">{selectedTitulo.codParceiro}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Valor</Label>
                  <p className="font-semibold text-lg">{formatCurrency(selectedTitulo.valor)}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Status</Label>
                  <Badge className={getStatusColor(selectedTitulo.status)}>
                    {selectedTitulo.status}
                  </Badge>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Data Vencimento</Label>
                  <p className="font-semibold">{formatDate(selectedTitulo.dataVencimento)}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Data Negociação</Label>
                  <p className="font-semibold">{formatDate(selectedTitulo.dataNegociacao)}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Tipo Financeiro</Label>
                  <Badge className={getTipoFinanceiroColor(selectedTitulo.tipoFinanceiro)}>
                    {selectedTitulo.tipoFinanceiro}
                  </Badge>
                </div>
                {selectedTitulo.contaBancaria && (
                  <div>
                    <Label className="text-xs text-muted-foreground">Conta Bancária</Label>
                    <p className="font-semibold">{selectedTitulo.contaBancaria}</p>
                  </div>
                )}
              </div>

              {selectedTitulo.historico && (
                <div>
                  <Label className="text-xs text-muted-foreground">Histórico</Label>
                  <p className="text-sm mt-1">{selectedTitulo.historico}</p>
                </div>
              )}

              {selectedTitulo.tipoTitulo === "Boleto" && selectedTitulo.boleto.nossoNumero && (
                <div className="border-t pt-4">
                  <h4 className="font-semibold mb-2">Informações do Boleto</h4>
                  <div className="space-y-2">
                    <div>
                      <Label className="text-xs text-muted-foreground">Nosso Número</Label>
                      <p className="font-mono text-sm">{selectedTitulo.boleto.nossoNumero}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}