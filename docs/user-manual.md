# GDP Dashboard User Manual

This manual covers the TypeScript and Go dashboards. The interface is available in English, Spanish, and French. The original Python app is unchanged.

## English

### Start

From the repository root, refresh the shared indicator and map data if it is not already present:

```sh
node scripts/refresh-dashboard-data.mjs
```

Start either dashboard using the commands in the repository README, then open its local URL in a browser.

### Use the dashboard

1. Choose **Language**. The TypeScript dashboard updates immediately and records the language in the page URL; the Go dashboard applies the selection when you click **Update dashboard**.
2. Choose **Indicator**: GDP in current US dollars, GDP per capita in current US dollars, or real GDP in constant 2015 US dollars.
3. Optionally select a **Region** and/or **Income group**. These filters narrow the country list, color only matching countries on the map, and limit the countries used in group averages.
4. Choose one or more **Countries** for the chart, metric cards, annual growth, rankings, and CSV export. Use Ctrl (Windows/Linux) or ⌘ (Mac) for multiple selections. When changing filters, country selections outside the new filter are removed.
5. Set the **From** and **To** years. The chart and export use that range; map, rankings, and group comparisons use the selected end year.
6. Select **Export visible data as CSV** to download the selected indicator for the selected countries and years.

### Read the results

- Missing observations are shown as unavailable and are not treated as zero.
- Map colors show relative quintile buckets among countries matching the active filters; gray means no reported value or a country outside the filters.
- Region and income-group averages are unweighted averages of countries with data for that indicator and year, not population-weighted averages or regional totals.
- GDP per capita is a current-US-dollar measure. Real GDP uses constant 2015 US dollars and adjusts for price changes over time.

## Español

### Inicio

Desde la carpeta raíz del repositorio, actualiza los datos compartidos de indicadores y del mapa si aún no existen:

```sh
node scripts/refresh-dashboard-data.mjs
```

Inicia uno de los paneles con los comandos del README del repositorio y abre su dirección local en el navegador.

### Uso del panel

1. Elige **Idioma**. El panel TypeScript se actualiza al instante y guarda el idioma en la URL; el panel Go aplica el cambio al pulsar **Actualizar panel**.
2. Elige un **Indicador**: PIB en dólares estadounidenses actuales, PIB per cápita en dólares actuales o PIB real en dólares constantes de 2015.
3. Si quieres, selecciona una **Región** o un **Grupo de ingresos**. Estos filtros limitan la lista de países, colorean únicamente los países coincidentes en el mapa y limitan los países incluidos en los promedios por grupo.
4. Elige uno o más **Países** para el gráfico, las tarjetas de métricas, el crecimiento anual, la clasificación y la exportación CSV. Usa Ctrl (Windows/Linux) o ⌘ (Mac) para seleccionar varios. Al cambiar los filtros se quitan las selecciones que ya no coinciden.
5. Define los años **Desde** y **Hasta**. El gráfico y la exportación usan ese intervalo; el mapa, la clasificación y las comparaciones usan el año final seleccionado.
6. Selecciona **Exportar datos visibles como CSV** para descargar el indicador, los países y los años elegidos.

### Interpretación

- Los datos ausentes se indican como no disponibles y no se convierten en cero.
- Los colores del mapa representan quintiles relativos entre los países que coinciden con los filtros; el gris indica que no hay datos o que el país queda fuera de los filtros.
- Los promedios por región y grupo de ingresos son promedios simples de los países con datos para el indicador y año; no están ponderados por población ni son totales regionales.
- El PIB per cápita está expresado en dólares actuales. El PIB real utiliza dólares constantes de 2015 y ajusta los cambios de precios a lo largo del tiempo.

## Français

### Démarrage

Depuis la racine du dépôt, actualisez les données partagées des indicateurs et de la carte si elles ne sont pas déjà présentes :

```sh
node scripts/refresh-dashboard-data.mjs
```

Démarrez l’un des tableaux de bord avec les commandes indiquées dans le README du dépôt, puis ouvrez son adresse locale dans un navigateur.

### Utilisation

1. Choisissez la **Langue**. Le tableau de bord TypeScript se met à jour immédiatement et conserve la langue dans l’URL ; le tableau de bord Go applique le choix lorsque vous cliquez sur **Actualiser le tableau**.
2. Choisissez un **Indicateur** : PIB en dollars américains courants, PIB par habitant en dollars courants ou PIB réel en dollars constants de 2015.
3. Vous pouvez choisir une **Région** et/ou un **Groupe de revenu**. Ces filtres réduisent la liste des pays, ne colorent sur la carte que les pays correspondants et limitent les pays inclus dans les moyennes par groupe.
4. Choisissez un ou plusieurs **Pays** pour le graphique, les cartes de mesures, la croissance annuelle, le classement et l’export CSV. Utilisez Ctrl (Windows/Linux) ou ⌘ (Mac) pour effectuer plusieurs sélections. Un changement de filtre retire les pays qui ne correspondent plus.
5. Définissez les années **De** et **À**. Le graphique et l’export utilisent cette période ; la carte, le classement et les comparaisons utilisent l’année de fin sélectionnée.
6. Cliquez sur **Exporter les données visibles au format CSV** pour télécharger l’indicateur, les pays et les années sélectionnés.

### Interprétation

- Les observations manquantes sont signalées comme indisponibles et ne sont pas assimilées à zéro.
- Les couleurs de la carte représentent des quintiles relatifs parmi les pays correspondant aux filtres actifs ; le gris indique une donnée absente ou un pays exclu par les filtres.
- Les moyennes par région et groupe de revenu sont des moyennes simples des pays disposant de données pour l’indicateur et l’année choisis ; elles ne sont ni pondérées par la population ni des totaux régionaux.
- Le PIB par habitant est exprimé en dollars courants. Le PIB réel utilise des dollars constants de 2015 et corrige les variations de prix au fil du temps.
