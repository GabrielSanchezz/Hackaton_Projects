// Curated paraphrases. Keep technical guidance, applicable law and Ybirá's own
// screening policy in separate records so an answer can attribute each correctly.
const manual = "https://www.prefeitura.sp.gov.br/cidade/secretarias/upload/meio_ambiente/MARBOURB.pdf";
const cityTrees = "https://prefeitura.sp.gov.br/web/meio_ambiente/w/parques/284396";
const nativeList = "https://legislacao.prefeitura.sp.gov.br/portaria-secretaria-municipal-do-verde-e-do-meio-ambiente-svma-26-de-29-de-abril-de-2024";
const ybira = "https://ybira-eosin.vercel.app/";
const census = "https://ftp.ibge.gov.br/Censos/Censo_Demografico_2022/Agregados_por_Setores_Censitarios/";

export const documents = [
  {
    id: "sidewalk-width",
    title: "Manual de Arborização de São Paulo · Calçada e canteiro (Tabela 01)",
    url: manual + "#page=24",
    text: "No município de São Paulo, o manual não recomenda plantar árvore em calçada pública com menos de 1,90 m de largura total. Preserve pelo menos 1,20 m de faixa livre para pedestres e meça a calçada sem incluir a largura da guia. A Tabela 01 relaciona largura do passeio, canteiro permeável e diâmetro máximo do tronco adulto. Passeio de 1,90 a 2,09 m: canteiro com largura mínima de 0,60 m e área mínima de 0,60 m², tronco até 0,50 m. De 2,10 a 2,39 m: 0,80 m, 0,80 m² e 0,70 m. De 2,40 a 2,79 m: 1,00 m, 1,20 m² e 0,90 m. Para largura maior que 2,80 m: 1,40 m, 2,00 m² e 1,20 m. A tabela não explicita exatamente 2,80 m. Largura suficiente, sozinha, não libera plantio. Keywords: sidewalk width pavement clearance pedestrians curb permeable bed accessible planting tree pit.",
  },
  {
    id: "electrical-wires",
    title: "Manual de Arborização de São Paulo · Rede elétrica (Tabela 02)",
    url: manual + "#page=25",
    text: "A Chave Arborizar considera o tipo da rede elétrica e o espaço disponível. A concessionária deve confirmar se uma rede compacta é isolada, pois isso não pode ser identificado só pela aparência. Na dúvida, o manual orienta tratar a rede como não isolada. Quando a largura da calçada permitir, o manual prefere posicionar o plantio fora do alinhamento da fiação, mantendo 1,20 m livres para pedestres. A Tabela 02 não define um teto universal de altura para toda calçada com fiação. Perto de fios e postes, a decisão técnica depende da rede, da posição do canteiro, dos obstáculos e da espécie. Keywords: overhead wires electrical utility power lines poles height insulated cables wires.",
  },
  {
    id: "distances-small-tree",
    title: "Manual de Arborização de São Paulo · Afastamentos (Tabela 03)",
    url: manual + "#page=27",
    text: "Na tabela municipal, para árvore de pequeno porte, mantenha no mínimo 5 m do alinhamento dos lotes na esquina, 2 m de postes, 2 m de caixas de inspeção, bueiros e bocas de lobo, e 1 m de guia rebaixada, faixa de pedestres e acesso de pedestres à edificação. Para transformador, o mínimo da coluna de pequeno porte é 3 m; para instalações subterrâneas e hidrantes, é 1 m. Árvores do mesmo porte usam limites de 5 m (pequeno), 8 m (médio) ou 12 m (grande). Entre portes diferentes, calcula-se a média dos limites; por exemplo, 6,5 m entre pequena e média e 8,5 m entre pequena e grande. Para postes a tabela indica 3 m nas colunas médio e grande. É necessário checar também visibilidade da sinalização e interferências no local. Keywords: setback spacing distance nearest pole curb ramp driveway storm drain manhole corner adjacent existing trees garage.",
  },
  {
    id: "sidewalk-species",
    title: "Manual de Arborização de São Paulo · Espécies para calçadas (Anexo I)",
    url: manual + "#page=66",
    text: "A Chave Arborizar combina condições da calçada e porte. O Anexo I descreve espécies indicadas para arborização de calçada e apresenta a faixa de altura adulta por espécie. O ipê-rosa-anão (Handroanthus heptaphyllus var. paulensis) consta como pequeno porte, 3–5 m. Confirme no viveiro que a muda é da forma anã, pois o nome comum ipê-rosa não garante esse porte. Tingui-preto tem faixa 4–7 m; a pitanga aparece como médio porte. As alturas de espécies de categorias diferentes podem se sobrepor; os valores 5 m, 8 m e 12 m da Tabela 03 são afastamentos entre árvores do mesmo porte. A lista de calçada não significa que uma espécie caiba em qualquer calçada. Keywords: native species small dwarf pink trumpet tree height mature medium large sidewalk species selection.",
  },
  {
    id: "local-native-list",
    title: "Prefeitura de São Paulo · Lista de espécies arbóreas nativas (Portaria 26/2024)",
    url: nativeList,
    text: "A Portaria SVMA 26/2024 publica a lista de espécies arbóreas nativas do município de São Paulo, com nomenclatura, sinônimos e nomes populares quando disponíveis. Use o nome científico para resolver nomes comuns que servem para várias espécies. Ser nativa do município não torna a árvore automaticamente apropriada para um passeio, fios ou uma situação específica. Confira também o porte adulto, o local e a recomendação do manual de arborização. A lista botânica não comprova disponibilidade atual de mudas. Keywords: local native tree catalogue inventory botanical scientific name species list nursery availability.",
  },
  {
    id: "request-156",
    title: "Prefeitura de São Paulo · Solicitar plantio pelo Portal 156",
    url: cityTrees,
    text: "Para solicitar uma nova árvore na calçada em frente ao imóvel na cidade de São Paulo, a Divisão de Arborização Urbana encaminha ao serviço de plantio do Portal SP156. O serviço pode ser aberto pelo link da Prefeitura; a equipe avalia o espaço, a infraestrutura e a espécie adequada. Para propor plantio em praça ou área livre, a Prefeitura orienta grupos locais a procurar o CADES Regional da respectiva Subprefeitura para avaliar o local e estruturar a proposta em conjunto. O Ask Ybirá orienta sobre o serviço e não registra pedido, emite protocolo ou aprova plantio. Keywords: how to request ask apply submit city hall municipal planting service SP156 156 free tree outside home park community public plaza.",
  },
  {
    id: "public-planting-law",
    title: "Lei Municipal 17.794/2022 · Plantio em área pública (arts. 11–12)",
    url: "https://legislacao.prefeitura.sp.gov.br/lei-17794-de-27-de-abril-de-2022/consolidado",
    text: "O art. 11 da lei de São Paulo prevê, em regra, comunicação prévia ao órgão municipal quando um particular planta em área pública. Também exige observar o plano de arborização, as normas técnicas e os afastamentos. Plantio de reparação ou compensação exige autorização da autoridade competente. O art. 12 dá prioridade às espécies nativas do município selecionadas conforme a orientação do órgão municipal. Para confirmar o procedimento de um imóvel ou local específico, consulte a Prefeitura. Keywords: permission authorization permit legal prior notice public street sidewalk city rules consent law.",
  },
  {
    id: "urban-tree-care",
    title: "Prefeitura de São Paulo · Manejo de árvores em calçadas",
    url: cityTrees,
    text: "Em áreas públicas, a Prefeitura orienta solicitar serviços de manejo como avaliação, poda ou remoção pelos canais municipais. A escolha da intervenção depende de avaliação e da situação da árvore e do local. A presença de fiação exige cuidado específico, incluindo atendimento da concessionária quando for necessário trabalhar junto à rede. A sombra das árvores ajuda a reduzir a exposição solar e as árvores também oferecem abrigo e alimento à fauna. Keywords: prune pruning trimming removal roots tree maintenance electric utility shade canopy.",
  },
  {
    id: "municipal-seedlings",
    title: "Prefeitura de São Paulo · Disponibilização de mudas",
    url: "https://prefeitura.sp.gov.br/web/meio_ambiente/w/servicos/viveiros/fornecimento_de_mudas/4465",
    text: "Os viveiros municipais produzem mudas para ações de vegetação na cidade de São Paulo. A página municipal explica como órgãos e unidades públicas podem solicitar mudas. Entidades sem fins lucrativos e órgãos não governamentais podem consultar os viveiros sobre doações para fins de interesse social, conforme as regras municipais. Para solicitar uma árvore na calçada de um imóvel, moradores devem consultar o serviço de plantio do SP156. Confirme espécie, estoque e requisitos com o viveiro. Keywords: get seedlings supply nursery stock donation NGO nonprofit free seedlings public institution volunteers.",
  },
  {
    id: "planting-screen",
    title: "Ybirá · Critérios da triagem com fiação",
    url: ybira + "#citizen",
    text: "Para a triagem do Ybirá em calçada com fiação, além das dimensões do manual, o protótipo usa critérios conservadores próprios: altura adulta de até 5 m, 3 m até o poste e 5 m até a iluminação pública. O formulário pergunta também pela esquina, árvore vizinha, acesso de garagem ou guia rebaixada, bueiro ou tampa de inspeção e canteiro. O protótipo limita a triagem automática com fiação a São Paulo na Mata Atlântica, e larga calçada acima de 3 m ou largura de exatamente 2,80 m pede vistoria. Uma calçada de 1,20 m falha no mínimo de 1,90 m. O ipê-rosa-anão é a opção nativa de 3–5 m que foi verificada no protótipo. A triagem não mede a rua nem autoriza plantio. Uma avaliação da prefeitura e da concessionária pode confirmar se o ponto é viável. Sem espaço, avalie dentro do lote, uma trepadeira nativa adequada ou fale com a prefeitura sobre um canteiro autorizado na faixa de estacionamento. Keywords: why Ybirá prototype results blocked rank planting checklist test site infeasible wiring.",
  },
  {
    id: "landsat-heat",
    title: "USGS · Temperatura da superfície no Landsat Collection 2",
    url: "https://www.usgs.gov/landsat-missions/landsat-collection-2-surface-temperature",
    text: "O produto térmico do Landsat mede a temperatura da superfície terrestre. Os valores representam o aquecimento de superfícies observadas, como telhados, piso, solo e vegetação, no instante da passagem do satélite. Não são previsão meteorológica, temperatura do ar ou sensação térmica. O mapa do Ybirá usa uma cena Landsat 9 de 29/11/2025. O painel calcula a média e o maior valor de pixels válidos dentro da área. O máximo é o pixel mais quente dessa cena, não um recorde climático. Falta de cobertura válida não equivale a zero calor. Keywords: heat map heat island surface temperature thermal hottest pixel air weather record max Landsat satellite date.",
  },
  {
    id: "census-map",
    title: "IBGE · Agregados do Censo 2022 por setor e distrito",
    url: census,
    text: "O Censo Demográfico 2022 fornece contagens agregadas. No Ybirá, moradores de 65 anos ou mais somam as faixas de 65–69, 70–79 e 80 ou mais, e a porcentagem usa a população total da área. Valores suprimidos ou faltantes ficam indisponíveis; não são zero. Cor ou raça do Censo descreve grupos agregados do território. A renda do painel é a mediana mensal das pessoas responsáveis pelo domicílio que declararam rendimento, não renda per capita ou renda de todos os domicílios. O percentual sem árvores usa os moradores em faces de quadra avaliadas no entorno dos domicílios. Ele não mede toda a cobertura vegetal do distrito. Keywords: Census demographics share older people age 65+ seniors population total median income Black Brown equity street trees housing gray unavailable.",
  },
  {
    id: "geosampa-map",
    title: "GeoSampa · Dados territoriais e unidades de saúde",
    url: "https://novogeosampa.prefeitura.sp.gov.br/",
    text: "O GeoSampa publica limites administrativos e camadas de vegetação, calçadas e equipamentos de saúde. No piloto da Brasilândia, o Ybirá usa a camada de UBSs para apoiar visitas de campo. A distância do centro do setor até a UBS mostrada é em linha reta. Não equivale ao tempo de caminhada nem comprova a área atendida pela unidade ou o endereço das pessoas. Ao vistoriar os acessos de uma UBS, verifique sombra nos horários de maior exposição, continuidade e largura livre da calçada, travessias, fiação e espaço para canteiros. A cobertura vegetal setorial do Ybirá inclui vegetação herbácea, arbustiva e arbórea. Keywords: public health clinics UBS health centre field visit audit route pedestrian walk shade São Paulo Brasilândia geodata parks green cover.",
  },
  {
    id: "vegetation-district",
    title: "Rede Nossa São Paulo · Cobertura vegetal por distrito (Mapa da Desigualdade)",
    url: "https://nossasaopaulo.org.br/o-que-fazemos/mapa-da-desigualdade/",
    text: "O percentual distrital de cobertura vegetal que o Ybirá usa foi publicado no Mapa da Desigualdade 2023, com referência de 2020. O indicador relaciona área de cobertura vegetal e área do distrito. Ele não descreve a distribuição da sombra na calçada nem indica se uma árvore está presente em cada face de quadra. Para setores da Brasilândia, o Ybirá usa sua estimativa espacial da camada de vegetação do GeoSampa. Compare unidades da mesma escala e observe o período de cada fonte. Keywords: vegetation canopy urban green coverage district neighborhood parks trees shade footpath.",
  },
  {
    id: "ybira-priority",
    title: "Ybirá · Metodologia de pontuação territorial",
    url: ybira + "#org",
    text: "O score é uma proposta de planejamento do Ybirá e indica por onde começar uma vistoria. Ele soma até 30 pontos de calor médio de superfície, 25 de falta de cobertura vegetal, 15 de menor renda mediana das pessoas responsáveis com rendimento, 15 da proporção de pessoas pretas ou pardas como critério de equidade territorial e 15 da proporção de moradores em faces avaliadas sem árvores. Calor e renda usam percentis dos recortes elegíveis na mesma escala; os demais critérios usam proporções. A classificação de distrito e a de setor da Brasilândia têm universos diferentes: compare distritos com distritos e setores com setores. Uma nota ausente pode indicar falta de indicador, menos de cinco pixels válidos ou menos de 80% de cobertura válida. Moradores 65+ e UBSs orientam vistoria, mas não somam pontos. O score descreve áreas e não identifica risco de moradores específicos nem autoriza plantio. Keywords: why explain rank score weight priority higher compare neighborhood selected district sector contribution methodology.",
  },
];
