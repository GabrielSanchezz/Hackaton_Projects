# Dados do Ybira — São Paulo e Brasilândia

## Mapa de prioridade

| Arquivo | Conteúdo e uso |
| --- | --- |
| `01_distritos_sp.geojson` | Limites dos 96 distritos municipais de São Paulo. |
| `01_limite_brasilandia.geojson` e `04_setores_brasilandia.geojson` | Limite do distrito-piloto e os 521 setores censitários do distrito. |
| `03_vegetacao_brasilandia.geojson` | Polígonos do mapeamento municipal de cobertura vegetal de 2020, baseado em imagens de 2017–2018. A classificação inclui vegetação herbácea, arbustiva e arbórea. Use `tx_descricao_categoria_subcategoria` para selecionar as classes e intercepte os polígonos com o limite antes de somar áreas. |
| `IBGE_distritos_sp_*.csv` | Demografia, cor ou raça, renda das pessoas responsáveis e características do entorno para os 96 distritos. |
| `IBGE_setores_brasilandia_*.csv` | Censo 2022 por setor da Brasilândia. Há 521 linhas na tabela básica, 513 em cor ou raça, 513 em renda e 508 em entorno. Preserve linhas ausentes e valores suprimidos como dados indisponíveis. |
| `05_temperatura_por_distrito_SP.csv` e `05_temperatura_por_setor_brasilandia.csv` | Média de temperatura de superfície em °C e proporção de pixels válidos por distrito ou setor. A média foi calculada a partir dos píxeis que interceptam cada área no recorte em WGS 84. |
| `05_temperatura_superficie_SP_2025-11-29_C.tif` | Temperatura de superfície numa passagem do Landsat 9 de 29/11/2025, em °C, sem os pixels marcados como preenchimento, nuvem dilatada, cirrus, nuvem, sombra de nuvem ou neve. Valor sem dados: −9999. |

Junte os dados por setor usando `cd_original_setor_censitario` no GeoJSON e `CD_SETOR` (ou `CD_setor` no entorno) nas tabelas. Para juntar os distritos, use `vinculo_distritos_IBGE_GeoSampa.csv`. Importe os códigos como texto, com separador ponto e vírgula e encoding UTF-8. As tabelas do IBGE preservam a notação decimal do arquivo de origem.

Para medir **falta de árvores no entorno dos moradores**, use `V05230 / (V05230 + V05231 + V05232 + V05233)` quando os quatro valores estiverem disponíveis e o denominador for positivo. A medida descreve os moradores de domicílios em faces de quadra com avaliação de arborização. No mapa municipal também é possível usar as contagens equivalentes de faces de quadra, `V05430` a `V05433`.

No Censo, `V01318` e `V01320` são as contagens de pessoas pretas e pardas. `V06006` é a mediana de rendimento mensal das pessoas responsáveis **com rendimento** em domicílios particulares permanentes ocupados. Os dicionários oficiais dos três conjuntos de dados acompanham a pasta.

O indicador Landsat representa **a temperatura da superfície em um único dia**. Identifique a data na interface e use a coluna `pct_pixels_validos` para informar a cobertura. O SampaClima lista uma série de 2017–2023, cujo download não respondeu nesta coleta.

### Painel de organizações

`gerar_metricas_ong.py` gera `../site/organization-data.js` a partir do GeoTIFF, dos polígonos setoriais, da cobertura vegetal e dos CSVs do Censo. Execute com Python, NumPy e Pillow. O painel usa os centros dos pixels dentro de cada setor, sem interpolar o pico ou misturar pixels sem dados. A média pode diferir da tabela anterior que usava pixels que interceptavam o setor. A cobertura vegetal reúne todas as classes do GeoSampa, aproximadas por uma grade de cerca de 6 m. O nome abaixo do distrito vem do campo `NM_FCU` do Censo quando preenchido.

Os pesos propostos estão em `../site/priority.js`. Percentis de temperatura e renda usam somente os setores elegíveis. O score não é calculado quando falta algum dos cinco indicadores ou a cena não tem pelo menos cinco pixels válidos com cobertura de 80% no setor. O indicador racial descreve a composição do setor. A renda é a mediana mensal dos responsáveis com rendimento. A exposição sem árvores descreve moradores em faces de quadra avaliadas pelo IBGE.

### Comparação entre os 96 distritos

`gerar_metricas_distritos.py` gera `../site/district-data.js` a partir do GeoTIFF, dos limites municipais, do vínculo GeoSampa–IBGE e dos agregados distritais do Censo. A média e o pico de superfície usam os centros dos pixels válidos dentro do distrito. A cobertura vegetal é o percentual distrital de 2020 publicado na planilha aberta do [Mapa da Desigualdade 2023](https://nossasaopaulo.org.br/o-que-fazemos/mapa-da-desigualdade/). A referência baixada fica em `originais/mapa_da_desigualdade_2023_dados.xlsx`. Execute com Python, Pillow, NumPy e openpyxl.

O score usa os mesmos pesos nas duas escalas. Os percentis distritais comparam os distritos entre si. Os percentis setoriais comparam somente os setores elegíveis da Brasilândia, cuja cobertura vegetal vem do cálculo sobre os polígonos do GeoSampa.

## Assistente de plantio

- `02_calcadas_brasilandia.geojson` reúne polígonos de calçada com largura mínima, máxima e o campo de largura média do serviço, além de declividade. As medidas descrevem o trecho. Confirme no ponto de plantio medidas, fiação, interferências e faixa livre.
- `Manual_tecnico_arborizacao_SP.pdf` traz os parâmetros municipais e o repertório para a equipe de engenharia florestal montar e revisar o catálogo de espécies do assistente.
- As camadas `apoio_*` trazem árvores viárias do levantamento histórico, escolas públicas, UBS/postos/centros de saúde e paradas de ônibus. Use o inventário de árvores como referência histórica.
- Calçadas, vegetação e camadas de apoio foram extraídas pelo retângulo de abrangência do distrito, de −46,715504 a −46,663511 de longitude e de −23,481366 a −23,415180 de latitude. Elas podem incluir feições de distritos vizinhos. Os limites do piloto e os setores por código correspondem ao distrito.

## Fontes

- [GeoSampa](https://novogeosampa.prefeitura.sp.gov.br/) e [serviço oficial WFS](https://wfs.geosampa.prefeitura.sp.gov.br/geoserver/geoportal/wfs?service=WFS&request=GetCapabilities). Camadas `distrito_municipal`, `calcada`, `cobertura_vegetal`, `setor_censitario_2022`, `arvore`, `equipamento_educacao_rede_publica`, `equipamento_saude_ubs_posto_centro` e `ponto_onibus`. Geometrias em WGS 84.
- [IBGE — agregados do Censo 2022](https://ftp.ibge.gov.br/Censos/Censo_Demografico_2022/Agregados_por_Setores_Censitarios/), [rendimento do responsável](https://ftp.ibge.gov.br/Censos/Censo_Demografico_2022/Agregados_por_Setores_Censitarios_Rendimento_do_Responsavel/) e [características urbanísticas do entorno](https://ftp.ibge.gov.br/Censos/Censo_Demografico_2022/Agregados_por_Setores_Censitarios_Caracteristicas_urbanisticas_do_entorno_dos_domicilios/).
- [Cena Landsat 9 no catálogo Planetary Computer](https://planetarycomputer.microsoft.com/api/stac/v1/collections/landsat-c2-l2/items/LC09_L2SP_219076_20251129_02_T1), [conversão para graus](https://www.usgs.gov/faqs/how-do-i-use-a-scale-factor-landsat-level-2-science-products) e [máscara de qualidade USGS](https://www.usgs.gov/landsat-missions/landsat-collection-2-quality-assessment-bands). As bandas ST_B10 e QA_PIXEL originais e os recortes utilizados estão em `originais`. Conversão de DN para °C: `DN × 0,00341802 − 124,15`. O recorte municipal tem 1.455 por 2.048 pixels e foi reprojetado para WGS 84.
- [Manual Técnico de Arborização Urbana da Prefeitura](https://prefeitura.sp.gov.br/meio_ambiente/w/publicacoes_svma/188452) e [SampaClima](https://sampaclima.prefeitura.sp.gov.br/indicadoresinternet/indicadores).
