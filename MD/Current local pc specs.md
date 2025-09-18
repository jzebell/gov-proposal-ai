# AI Workstation Build Specifications & Benchmark Results

## System Configuration

### Core Components
- **CPU:** AMD Ryzen 9 9950X3D (16-core/32-thread)
  - Base Clock: 4.3 GHz
  - Max Boost: 5.7 GHz
  - L3 Cache: 192MB (3D V-Cache)
  - TDP: 170W
- **Motherboard:** ASUS ROG Strix X870-I Gaming WiFi (Mini-ITX)
- **RAM:** 128GB DDR5-6000 (2x64GB)
- **GPU:** NVIDIA GeForce RTX 5060 Ti (16GB GDDR7)
- **PSU:** Corsair SF1000L (1000W SFX-L)
- **Cooling:** Corsair 240mm AIO
- **Case:** Dan A4-H2O (11L volume)

### Storage
- **Primary:** Crucial T710 4TB PCIe 5.0 NVMe (Gen5 slot)
- **Secondary:** Samsung 990 EVO Plus 4TB PCIe 4.0 NVMe (Gen4 slot)

## Performance Benchmarks

### Storage Performance (CrystalDiskMark)

#### Crucial T710 4TB (Gen5)
- **Sequential Read:** 13,934 MB/s
- **Sequential Write:** 13,235 MB/s
- **Random 4K Read (Q32T1):** 749 MB/s
- **Random 4K Write (Q32T1):** 360 MB/s

#### Samsung 990 EVO Plus 4TB (Gen4)
- **Sequential Read:** 6,535 MB/s
- **Sequential Write:** 5,749 MB/s
- **Random 4K Read (Q32T1):** 886 MB/s
- **Random 4K Write (Q32T1):** 433 MB/s

### Memory Performance (AIDA64)
- **Memory Read:** 71,140 MB/s (71.1 GB/s)
- **Memory Latency:** 91.7 ns
- **L1 Cache Write:** 5,283 GB/s
- **L1 Cache Copy:** 9,704 GB/s
- **L2 Cache Read:** 3,816 GB/s
- **L3 Cache Read:** 1,361 GB/s
- **L3 Cache Write:** 1,542 GB/s

### CPU Performance
- **Observed Boost Clocks:** 5.5-5.7 GHz on favored cores
- **All-Core Frequency:** ~5.0-5.2 GHz under load
- **Operating Temperature:** ~50°C under partial load
- **CrystalMark Retro CPU Scores:**
  - Single Thread: 17,859
  - Multi Thread: 348,461

### AI Inference Performance (Ollama)

#### Mistral 7B Model (Q4 Quantization)
- **Prompt Evaluation:** 8,807 tokens/second
- **Generation Speed:** 77.6 tokens/second
- **Model Load Time:** ~8 seconds
- **VRAM Usage:** ~4GB

#### Qwen 2.5 14B Model (Q4 Quantization)
- **Prompt Evaluation:** 16,857 tokens/second
- **Generation Speed:** 39.9 tokens/second
- **Model Load Time:** ~37 seconds
- **VRAM Usage:** ~8-9GB

#### Qwen 2.5 32B Model (Q4 Quantization)
- **Prompt Evaluation:** 96.6 tokens/second
- **Generation Speed:** 5.0 tokens/second
- **Model Load Time:** ~40 seconds
- **VRAM Usage:** ~15-16GB (maxing out available VRAM)

## System Capabilities

### Current Limitations
- **VRAM:** 16GB limits model size
  - Excellent for models up to 14B parameters
  - Struggles with 32B models (memory overflow)
  - Cannot run 70B models

### Thermal Performance
- **GPU:** Running cool at 41°C idle
- **CPU:** 240mm AIO maintains ~50°C under load
- **Case Thermal Limit:** ~300W for GPU cooling

### Use Case Performance
- **7B-14B Models:** Exceptional performance (40-77 tok/s)
- **32B Models:** Usable but limited (5 tok/s)
- **Optimal Model Size:** 14B parameters for best speed/quality balance
- **Primary Application:** Contract analysis, SOW risk assessment, AI agent development

## Upgrade Considerations

### Current GPU Upgrade Options Evaluated
1. **RTX 5090** (32GB, $2000, 575W) - Thermal concerns for case
2. **RTX PRO 5000 Blackwell** (48GB, $4500, 300W) - Ideal thermal fit
3. **RTX 6000 Ada** (48GB, $6000, 300W) - Previous gen
4. **RTX 6000 Blackwell** (96GB, $8500, 600W) - Too high TDP