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
4. Choose one or more **Countries** for the chart, metric cards, annual growth, multi-year growth trend, cumulative change, rankings, and CSV export. Use Ctrl (Windows/Linux) or ⌘ (Mac) for multiple selections. When changing filters, country selections outside the new filter are removed.
5. Set the **From** and **To** years. The chart and export use that range; map, rankings, and group comparisons use the selected end year.
6. Select **Export visible data as CSV** to download the selected indicator for the selected countries and years.
7. Optionally select **Save this view on this device** to store the current language, indicator, filters, selected countries, and year range in browser storage. Select **Restore saved view** on a later visit to reapply it, or **Clear saved view** to remove it. The saved view remains on that browser/device; it is not sent to the data provider and is not included in activity telemetry.
8. Review the **Data coverage audit** to see how many observations are available for each selected country and indicator over the chosen years, the coverage percentage, and any missing years.

### Read the results

- Missing observations are shown as unavailable and are not treated as zero.
- Annual growth is year-over-year percent change: (current-year value − previous-year value) ÷ previous-year value × 100. Growth is unavailable when the previous year's value is missing or zero.
- The growth trend table shows that calculation for each year in the selected range. Its first year uses the calendar year immediately before the range as the denominator, so it may be unavailable even when the first selected year has data.
- Cumulative change is a separate start-to-end percent change: (end-year value − start-year value) ÷ start-year value × 100. It is unavailable if either endpoint is missing or the start-year value is zero.
- The data coverage audit counts reported observations, including legitimate zero values. Its percentage describes availability only; it is not a measure of source quality or statistical reliability.
- The data-services panel shows the source and last refresh time of the World Bank indicator snapshot. The live activity feed tracks dashboard selections and CSV exports on the current page only; it is not a real-time World Bank event stream, does not persist after leaving the page, and sends no usage telemetry.
- Saved views are optional and browser-local. They are separate from the page-local activity feed and can be restored only in the same browser profile and dashboard origin.
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
4. Elige uno o más **Países** para el gráfico, las tarjetas de métricas, el crecimiento anual, la tendencia plurianual, la variación acumulada, la clasificación y la exportación CSV. Usa Ctrl (Windows/Linux) o ⌘ (Mac) para seleccionar varios. Al cambiar los filtros se quitan las selecciones que ya no coinciden.
5. Define los años **Desde** y **Hasta**. El gráfico y la exportación usan ese intervalo; el mapa, la clasificación y las comparaciones usan el año final seleccionado.
6. Selecciona **Exportar datos visibles como CSV** para descargar el indicador, los países y los años elegidos.
7. Si quieres, selecciona **Guardar esta vista en este dispositivo** para guardar en el navegador el idioma, el indicador, los filtros, los países y el intervalo de años. Usa **Restaurar vista guardada** en otra visita para volver a aplicarla o **Borrar vista guardada** para eliminarla. La vista se conserva solo en ese navegador/dispositivo; no se envía al proveedor de datos ni se incluye en la actividad.
8. Consulta la **Auditoría de cobertura** para ver cuántas observaciones hay por país e indicador en los años elegidos, el porcentaje de cobertura y los años sin datos.

### Interpretación

- Los datos ausentes se indican como no disponibles y no se convierten en cero.
- El crecimiento anual es la variación porcentual interanual: (valor del año actual − valor del año anterior) ÷ valor del año anterior × 100. No está disponible si falta el valor del año anterior o es cero.
- La tabla de tendencia muestra ese cálculo para cada año del intervalo seleccionado. El primer año usa como denominador el año calendario anterior al intervalo, por lo que puede no estar disponible aunque haya datos para el primer año seleccionado.
- La variación acumulada es un cálculo distinto entre el inicio y el final: (valor del año final − valor del año inicial) ÷ valor del año inicial × 100. No está disponible si falta alguno de los extremos o si el valor inicial es cero.
- La auditoría de cobertura cuenta las observaciones disponibles, incluidos los valores legítimos de cero. El porcentaje solo describe disponibilidad, no calidad de la fuente ni fiabilidad estadística.
- El panel de servicios de datos muestra la fuente y la última actualización de la instantánea de indicadores del Banco Mundial. El registro de actividad en directo muestra selecciones y exportaciones CSV solo en la página actual; no es una transmisión de eventos del Banco Mundial, no persiste al salir de la página y no envía datos de uso.
- Las vistas guardadas son opcionales y locales al navegador. Son independientes del registro de actividad y solo se pueden restaurar en el mismo perfil del navegador y origen del panel.
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
4. Choisissez un ou plusieurs **Pays** pour le graphique, les cartes de mesures, la croissance annuelle, la tendance pluriannuelle, la variation cumulée, le classement et l’export CSV. Utilisez Ctrl (Windows/Linux) ou ⌘ (Mac) pour effectuer plusieurs sélections. Un changement de filtre retire les pays qui ne correspondent plus.
5. Définissez les années **De** et **À**. Le graphique et l’export utilisent cette période ; la carte, le classement et les comparaisons utilisent l’année de fin sélectionnée.
6. Cliquez sur **Exporter les données visibles au format CSV** pour télécharger l’indicateur, les pays et les années sélectionnés.
7. Vous pouvez choisir **Enregistrer cette vue sur cet appareil** pour stocker dans le navigateur la langue, l’indicateur, les filtres, les pays et la période. Choisissez **Restaurer la vue enregistrée** lors d’une prochaine visite pour la réappliquer, ou **Supprimer la vue enregistrée** pour l’effacer. La vue reste dans ce navigateur/appareil ; elle n’est pas envoyée au fournisseur de données ni incluse dans l’activité.
8. Consultez l’**Audit de couverture** pour connaître le nombre d’observations disponibles par pays et indicateur sur la période choisie, le pourcentage de couverture et les années manquantes.

### Interprétation

- Les observations manquantes sont signalées comme indisponibles et ne sont pas assimilées à zéro.
- La croissance annuelle est la variation en pourcentage d'une année à l'autre : (valeur de l'année en cours − valeur de l'année précédente) ÷ valeur de l'année précédente × 100. Elle est indisponible si la valeur de l'année précédente est absente ou nulle.
- Le tableau de tendance présente ce calcul pour chaque année de la période sélectionnée. La première année utilise l'année civile précédente comme dénominateur ; le résultat peut donc être indisponible même si la première année sélectionnée contient une observation.
- La variation cumulée est un calcul distinct entre le début et la fin : (valeur de l'année finale − valeur de l'année initiale) ÷ valeur de l'année initiale × 100. Elle est indisponible si l'une des deux observations manque ou si la valeur initiale est nulle.
- L’audit de couverture compte les observations disponibles, y compris les valeurs nulles légitimes. Le pourcentage indique uniquement la disponibilité, pas la qualité de la source ni la fiabilité statistique.
- Le panneau des services de données indique la source et la date d’actualisation du dernier instantané d’indicateurs de la Banque mondiale. Le fil d’activité en direct suit les sélections et les exports CSV sur la page actuelle uniquement ; il ne s’agit pas d’un flux d’événements en temps réel de la Banque mondiale, il n’est pas conservé après avoir quitté la page et aucune télémétrie d’utilisation n’est envoyée.
- Les vues enregistrées sont facultatives et restent dans le navigateur. Elles sont distinctes du fil d’activité et ne peuvent être restaurées que dans le même profil de navigateur et à la même adresse du tableau de bord.
- Les couleurs de la carte représentent des quintiles relatifs parmi les pays correspondant aux filtres actifs ; le gris indique une donnée absente ou un pays exclu par les filtres.
- Les moyennes par région et groupe de revenu sont des moyennes simples des pays disposant de données pour l’indicateur et l’année choisis ; elles ne sont ni pondérées par la population ni des totaux régionaux.
- Le PIB par habitant est exprimé en dollars courants. Le PIB réel utilise des dollars constants de 2015 et corrige les variations de prix au fil du temps.
