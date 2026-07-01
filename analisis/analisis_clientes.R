# =====================================================================
# TAREA INTEGRADORA - Analisis de datos y mineria de datos con R
# Analisis inteligente de clientes (Semanas 11 a 15)
# Topicos Especiales de Base de Datos - PUCE Ibarra - 2026-01
# =====================================================================
# Paquetes
suppressMessages({
  library(rpart)        # Arboles de decision
  library(rpart.plot)   # Visualizacion del arbol
  library(arules)       # Reglas de asociacion
})

# Carpeta de salida para los graficos
dir.create("figuras", showWarnings = FALSE)

# =====================================================================
# FASE 1. PREPARACION Y EXPLORACION DE DATOS
# =====================================================================
cat("=====================================================\n")
cat(" FASE 1: PREPARACION Y EXPLORACION\n")
cat("=====================================================\n")

datos <- read.csv("clientes.csv", stringsAsFactors = FALSE)

# Estructura general de la base
cat("Numero de filas:", nrow(datos), "\n")
cat("Numero de columnas:", ncol(datos), "\n")
cat("Nombres de variables:", paste(names(datos), collapse = ", "), "\n\n")

cat(">> Tipos de datos por variable:\n")
print(sapply(datos, class))

cat("\n>> Valores nulos por variable:\n")
print(colSums(is.na(datos)))

cat("\n>> Registros duplicados:", sum(duplicated(datos)), "\n")

# --- Estructura de control (if / else) requerida ---
if (sum(is.na(datos)) > 0) {
  print("La base contiene valores nulos")
} else {
  print("La base no contiene valores nulos")
}

# --- Limpieza: eliminar duplicados e imputar nulos numericos con la mediana ---
datos <- datos[!duplicated(datos), ]
datos$ingresos[is.na(datos$ingresos)] <- median(datos$ingresos, na.rm = TRUE)

# Convertir variables categoricas a factor
datos$ciudad             <- as.factor(datos$ciudad)
datos$categoria_producto <- as.factor(datos$categoria_producto)
datos$compra             <- as.factor(datos$compra)

cat("\n>> Base luego de la limpieza -> filas:", nrow(datos),
    "| nulos:", sum(is.na(datos)), "| duplicados:", sum(duplicated(datos)), "\n")

# --- Uso de otras estructuras de datos de R (vector, lista, matriz) ---
vector_edades <- datos$edad                       # 1) VECTOR
lista_info <- list(                               # 2) LISTA
  n_clientes = nrow(datos),
  variables  = names(datos),
  ciudades   = levels(datos$ciudad)
)
matriz_num <- as.matrix(datos[, c("edad","ingresos","frecuencia")])  # 3) MATRIZ
cat("\n>> Estructuras usadas -> vector(", length(vector_edades),
    "), lista(", length(lista_info), "campos ), matriz(",
    nrow(matriz_num), "x", ncol(matriz_num), ")\n")

# --- Estructura de control (for) para reportar rangos numericos ---
cat("\n>> Rango de las variables numericas (bucle for):\n")
for (v in c("edad","ingresos","frecuencia")) {
  cat("   -", v, ": min =", min(datos[[v]]), " max =", max(datos[[v]]), "\n")
}

# =====================================================================
# FASE 2. FUNCIONES PROPIAS Y ANALISIS DESCRIPTIVO
# =====================================================================
cat("\n=====================================================\n")
cat(" FASE 2: FUNCIONES Y ANALISIS DESCRIPTIVO\n")
cat("=====================================================\n")

# --- Funcion propia de indicadores estadisticos ---
calcular_resumen <- function(variable) {
  c(
    media    = mean(variable, na.rm = TRUE),
    mediana  = median(variable, na.rm = TRUE),
    minimo   = min(variable, na.rm = TRUE),
    maximo   = max(variable, na.rm = TRUE),
    desv_est = sd(variable, na.rm = TRUE)
  )
}

cat(">> Resumen de EDAD:\n");     print(round(calcular_resumen(datos$edad), 2))
cat(">> Resumen de INGRESOS:\n"); print(round(calcular_resumen(datos$ingresos), 2))

# Frecuencias de variables categoricas
cat("\n>> Frecuencia por ciudad:\n");            print(table(datos$ciudad))
cat("\n>> Frecuencia por categoria de producto:\n"); print(table(datos$categoria_producto))

# Correlacion entre dos variables numericas
correlacion <- cor(datos$ingresos, datos$frecuencia)
cat("\n>> Correlacion ingresos vs frecuencia:", round(correlacion, 3), "\n")

# --- Grafico 1: barras (categoria de producto) ---
png("figuras/01_barras_categoria.png", width = 720, height = 480)
barplot(table(datos$categoria_producto),
        col = "steelblue", main = "Clientes por categoria de producto",
        xlab = "Categoria de producto", ylab = "Numero de clientes")
invisible(dev.off())

# --- Grafico 2: histograma (ingresos) ---
png("figuras/02_histograma_ingresos.png", width = 720, height = 480)
hist(datos$ingresos, col = "darkorange", breaks = 15,
     main = "Distribucion de ingresos mensuales",
     xlab = "Ingresos (USD)", ylab = "Frecuencia")
invisible(dev.off())

# --- Grafico 3: dispersion (ingresos vs frecuencia) ---
png("figuras/03_dispersion.png", width = 720, height = 480)
plot(datos$ingresos, datos$frecuencia,
     col = ifelse(datos$compra=="Si","forestgreen","red"), pch = 19,
     main = "Ingresos vs Frecuencia de compra",
     xlab = "Ingresos (USD)", ylab = "Frecuencia (visitas/mes)")
legend("topright", legend = c("Compra: Si","Compra: No"),
       col = c("forestgreen","red"), pch = 19)
invisible(dev.off())

# --- Grafico 4: caja (edad por compra) ---
png("figuras/04_boxplot_edad.png", width = 720, height = 480)
boxplot(edad ~ compra, data = datos, col = c("salmon","lightgreen"),
        main = "Edad segun decision de compra",
        xlab = "Compra", ylab = "Edad (anios)")
invisible(dev.off())

cat("\n>> Graficos descriptivos generados en carpeta figuras/\n")

# =====================================================================
# FASE 3. ARBOL DE DECISION
# =====================================================================
cat("\n=====================================================\n")
cat(" FASE 3: ARBOL DE DECISION\n")
cat("=====================================================\n")

# Variable objetivo: compra | Predictoras: edad, ingresos, frecuencia, categoria_producto
set.seed(123)
idx    <- sample(1:nrow(datos), size = 0.7 * nrow(datos))
entren <- datos[idx, ]
prueba <- datos[-idx, ]

modelo_arbol <- rpart(
  compra ~ edad + ingresos + frecuencia + categoria_producto,
  data = entren, method = "class"
)

png("figuras/05_arbol_decision.png", width = 820, height = 560)
rpart.plot(modelo_arbol, type = 2, extra = 104, box.palette = "GnBu",
           main = "Arbol de decision - Prediccion de compra")
invisible(dev.off())

cat(">> Reglas del arbol:\n")
print(modelo_arbol)

# Precision: matriz de confusion sobre el conjunto de prueba
pred <- predict(modelo_arbol, prueba, type = "class")
mc   <- table(Real = prueba$compra, Prediccion = pred)
cat("\n>> Matriz de confusion (conjunto de prueba):\n"); print(mc)
precision <- sum(diag(mc)) / sum(mc)
cat(">> Precision (accuracy):", round(precision, 3), "\n")

cat("\n>> Importancia de variables:\n")
print(round(modelo_arbol$variable.importance, 2))

# =====================================================================
# FASE 4. REGLAS DE ASOCIACION
# =====================================================================
cat("\n=====================================================\n")
cat(" FASE 4: REGLAS DE ASOCIACION\n")
cat("=====================================================\n")

# Discretizar variables numericas para construir transacciones
datos_trx <- data.frame(
  ciudad    = datos$ciudad,
  categoria = datos$categoria_producto,
  compra    = datos$compra,
  edad_g    = cut(datos$edad, breaks = c(0,30,45,100),
                  labels = c("edad_joven","edad_media","edad_mayor")),
  ingreso_g = cut(datos$ingresos, breaks = c(0,1000,1500,1e6),
                  labels = c("ingreso_bajo","ingreso_medio","ingreso_alto"))
)
transacciones <- as(datos_trx, "transactions")

reglas <- apriori(transacciones,
                  parameter = list(support = 0.05, confidence = 0.60, minlen = 2),
                  control   = list(verbose = FALSE))
reglas <- sort(reglas, by = "lift")

cat(">> Total de reglas generadas:", length(reglas), "\n")
cat(">> Cinco reglas principales por lift:\n")
top5 <- head(reglas, 5)
arules::inspect(top5)

# Guardar top5 en data frame para el informe
df_reglas <- as(top5, "data.frame")
write.csv(df_reglas, "reglas_top5.csv", row.names = FALSE)

# =====================================================================
# FASE 5. CLUSTERING (K-MEANS)
# =====================================================================
cat("\n=====================================================\n")
cat(" FASE 5: CLUSTERING K-MEANS\n")
cat("=====================================================\n")

datos_cluster <- scale(datos[, c("edad","ingresos","frecuencia")])  # normalizacion
set.seed(123)
modelo_cluster <- kmeans(datos_cluster, centers = 3, nstart = 25)
datos$cluster  <- factor(modelo_cluster$cluster)

cat(">> Registros por cluster:\n"); print(table(datos$cluster))
cat("\n>> Perfil promedio de cada cluster (variables originales):\n")
perfil <- aggregate(cbind(edad, ingresos, frecuencia) ~ cluster, data = datos, FUN = mean)
perfil[, -1] <- round(perfil[, -1], 1)
print(perfil)

png("figuras/06_clusters.png", width = 720, height = 480)
plot(datos$ingresos, datos$frecuencia, col = modelo_cluster$cluster, pch = 19,
     main = "Segmentacion de clientes (k-means)",
     xlab = "Ingresos (USD)", ylab = "Frecuencia (visitas/mes)")
points(aggregate(cbind(ingresos,frecuencia) ~ cluster, data = datos, FUN = mean)[,2:3],
       col = 1:3, pch = 8, cex = 3, lwd = 3)
legend("topright", legend = paste("Cluster", 1:3), col = 1:3, pch = 19)
invisible(dev.off())

cat("\n>> Analisis completado con exito.\n")
