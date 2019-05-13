if (!require(pacman)) {
  install.packages("pacman")
  library(pacman)
}

pacman::p_load(magrittr, dplyr, tidyr, ggplot2, gdata, reshape2, forcats)

library(readr)

getDataSeries <- function (sourceFile)
{
  data <- read_csv(sourceFile, col_types = cols(timestamp = col_datetime(format = "%Y-%m-%D %H:%M:%S")), 
                               trim_ws = FALSE)
  
  data$uptime_seconds <- data$uptime_seconds - data$uptime_seconds[1]
  
  return(data)
}

saveToPDF <- function(plot, pdfFile)
{
  ggsave(pdfFile,plot, width=16, height=10, units="cm", scale=1)
}

glances_threads1 <- getDataSeries("./LIXO/glances_1_thread.csv")
glances_threads2 <- getDataSeries("./LIXO/glances_2_thread.csv")
glances_threads4 <- getDataSeries("./LIXO/glances_4_thread.csv")
glances_threads8 <- getDataSeries("./LIXO/glances_8_thread.csv")


# Calculate build times
build_times <- data.frame(
  Instances = factor(c(1,2,4,8)),
  Build_time = c(
    glances_threads1$uptime_seconds[length(glances_threads1$uptime_seconds)],
    glances_threads2$uptime_seconds[length(glances_threads2$uptime_seconds)],
    glances_threads4$uptime_seconds[length(glances_threads4$uptime_seconds)],
    glances_threads8$uptime_seconds[length(glances_threads8$uptime_seconds)]
  ))

# Plot build time
build_time_vs_instances<-ggplot(data=build_times, aes(x=Instances, y=Build_time, fill=Instances)) +
  geom_bar(stat="identity") + 
  xlab("Number of instances") + 
  ylab("Build time (seconds)")

print(build_time_vs_instances)

saveToPDF(build_time_vs_instances, "./build_time_vs_instances.pdf")


# Plot cpu usage
cpu_chart <- ggplot() + 
  geom_line(data = glances_threads1, aes(x = uptime_seconds, y = cpu_total), color = "#00AFBB", size = 0.5) + 
  geom_line(data = glances_threads2, aes(x = uptime_seconds, y = cpu_total), color = "#FFAFBB", size = 0.5) +
  geom_line(data = glances_threads4, aes(x = uptime_seconds, y = cpu_total), color = "#00FF00", size = 0.5) +
  xlab("Build time (seconds)") + 
  ylab("CPUs Usage (percent)")
saveToPDF(cpu_chart, "./cpu_chart.pdf")

# Plot write bytes
diskio_write_chart <- ggplot() + 
  geom_line(data = glances_threads1, aes(x = uptime_seconds, y = diskio_disk0_write_bytes), color = "#00AFBB", size = 0.5) + 
  geom_line(data = glances_threads2, aes(x = uptime_seconds, y = diskio_disk0_write_bytes), color = "#FFAFBB", size = 0.5) +
  geom_line(data = glances_threads4, aes(x = uptime_seconds, y = diskio_disk0_write_bytes), color = "#00FF00", size = 0.5) +
  xlab("Build time (seconds)") + 
  ylab("Disk I/O Write (bytes/s)")
saveToPDF(diskio_write_chart, "./diskio_write_chart.pdf")

# Plot read bytes
diskio_read_chart <- ggplot() + 
  geom_line(data = glances_threads1, aes(x = uptime_seconds, y = diskio_disk0_read_bytes), color = "#00AFBB", size = 0.5) + 
  geom_line(data = glances_threads2, aes(x = uptime_seconds, y = diskio_disk0_read_bytes), color = "#FFAFBB", size = 0.5) +
  geom_line(data = glances_threads4, aes(x = uptime_seconds, y = diskio_disk0_read_bytes), color = "#00FF00", size = 0.5) +
  xlab("Build time (seconds)") + 
  ylab("Disk I/O Read (bytes/s)")

saveToPDF(read_chart, "./diskio_read_chart.pdf")

# Plot active memory usage
mem_chart <- ggplot() + 
  geom_line(data = glances_threads1, aes(x = uptime_seconds, y = mem_active), color = "#00AFBB", size = 0.5) + 
  geom_line(data = glances_threads2, aes(x = uptime_seconds, y = mem_active), color = "#FFAFBB", size = 0.5) +
  geom_line(data = glances_threads4, aes(x = uptime_seconds, y = mem_active), color = "#00FF00", size = 0.5) +
  xlab("Build time (seconds)") + 
  ylab("Active Usage (bytes)")
saveToPDF(mem_chart, "./mem_chart.pdf")

