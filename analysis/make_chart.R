if (!require(pacman)) {
  install.packages("pacman")
  library(pacman)
}

pacman::p_load(magrittr, dplyr, tidyr, ggplot2, gdata, reshape2, forcats, parsedate, RcppCCTZ)

glances <- df()

library(readr)
glances_1_thread <- read_csv("LIXO/glances_1_thread.csv", 
                             col_types = cols(timestamp = col_datetime(format = "%Y-%m-%D %H:%M:%S")), 
                             trim_ws = FALSE)
# View(glances_1_thread)


# Basic line plot
chart <-  ggplot(data = glances_1_thread, aes(x = uptime, y = cpu_idle))+
  geom_line(color = "#00AFBB", size = 2)
