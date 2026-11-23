# 各類 bug 的嘗試方法與數據（整理筆記）

用途：寫總覽頁之前的底稿。每類依同樣欄位整理：定義與頻率 → 判斷需要什麼資訊 → 做法（流派）與代表研究 → 資料 / benchmark → 關鍵數字 → 缺口。
數字全部來自文獻；出處見每段的「來源」。標 ⚠ 的是預印本或有已知的計算疑點。

---

## 0. 共用背景

### 0.1 為什麼要自動化 QA
| 事實 | 數字 | 來源 |
|---|---|---|
| 業界幾乎完全靠人工試玩 | "rely, almost exclusively, upon manual play-testing" | Politowski 等人 2021（arXiv 2103.06431） |
| 開發者對自動化 agent 存疑；主要顧慮是前期成本（建工具、訓練 agent）；7 個學術方案沒有一個適合小型團隊 | 問卷 12 人 | Politowski 等人 2022（arXiv 2202.12777）§5.2 |
| 動作組合測不完 | 開發者：「每種動作在每種情境下的每種順序，組合上通常不可能測完」 | Truelove 2021 問卷 |
| 自動化的規模優勢 | EA 的平行 RL agent 每秒約 3 萬個動作，約等於 3,000 名玩家 | Bergdahl 等人 CoG 2020 |
| 手機相容性測試的量 | TestBird 2020：11,476 款遊戲、552,851 個問題 | 轉引自 GLIB |
| AI 輔助人工測試 | GPT-4o 標出可疑處：有 AI 輔助正確率 62.7%、純人工 41.3%；AI 判錯會把人帶錯（276 人、800 個案例） | Zhang 等人 arXiv 2501.11782 v2（2026-04）⚠ |

### 0.2 為什麼要先分類
自動 QA 要解決兩件事：**走到** bug（探索、重現）和**認出** bug（oracle，判斷什麼叫錯）。
不同類 bug 在這兩件事上的需求完全不同：

| 類別 | 走到 | 認出時需要的資訊 |
|---|---|---|
| 當機 | 難（要重現路徑） | 不需要：程式關掉就是錯 |
| 畫面渲染 | 中等 | 一張截圖 |
| 時間性 | 中等 | 一段影片 |
| 動作與互動 | 難（組合爆炸） | 影片 + 玩家輸入（有時要內部狀態） |
| 資訊與介面 | 中等 | 呈現壞了：截圖；內容錯了：正確答案（內部值、資料檔） |

所以沒有一種方法能通吃；分類的作用是：(1) 用頻率和嚴重度決定先做哪類；(2) 看出每類需要的輸入與 oracle；(3) 在同一把尺上比較各類的研究進度與缺口。
（這張表是本報告的整理，不是文獻原表；各格的依據在下面各類的段落裡。）

### 0.3 分類本身
| 分類 | 來源與規模 | 類數 | 發表形式 / 引用（OpenAlex 2026-11） |
|---|---|---|---|
| Lewis 2010 | 線上影片、文章、玩家社群 | 11；最上層 temporal / non-temporal | FDG（同行審查）/ 109 |
| Truelove 2021 | Steam 30 款熱門遊戲、723 次更新、12,122 筆修正；47 份開發者問卷 | 20（Lewis 11 + 新 9） | ICSE 2021 海報 + arXiv 完整版 / 44；兩位作者共同標註，無一致性係數 |
| Butt 2023 | 多來源文獻回顧，436 份來源；從業者問卷 | 63，第一層 8 大類 | arXiv / 9 |
| VGBT 2025 | Butt 的期刊版；套用到 0 A.D. 論壇 594 則回報 | 63 | MTAP 期刊 / 1；資料公開（Zenodo 15463539） |

補充來源（2026-11-23 查證）：
- Truelove 2021 的正式發表是 ICSE 2021 Companion 海報（ICSE-Companion，OpenAlex 44 次引用）；完整論文只在 arXiv。標註由兩位作者共同進行，原文說 "there were no disagreements between the authors"，沒有一致性係數。
- Butt 2023（arXiv 2311.16645）§3："These include the 20 categories proposed by Lewis et al."——Butt 把 Lewis 連同子類算成 20 類；Truelove 則說 Lewis 有 11 類。
- 對照引用數（OpenAlex）：GLIB 47、Politowski 2021 遊戲測試回顧 136、Politowski 2022 68。

### 0.4 頻率與嚴重度（Truelove）
- 最常被修：Information、Game Graphics、Action；最少：Camera、Interrupted Event、Exploit。
- 最常復發：Crash、Game Graphics、Triggered Event；Camera、Event Occurrence、Interrupted Event 零復發。
- 最嚴重（出現在緊急更新的比例）：Crash 38%（580 次中 219 次），其次 Object Persistence、Triggered Event。
- 作者結論：Information 最常見但不常復發、不嚴重；"Crash bugs could probably use a greater focus from researchers"。

手機（轉引自 GLIB）：畫面顯示異常 WeTest 47.5%、TestBird 39.95%；當機 TestBird 28.76%。
網易 20 款遊戲、466 份回報 → 201 張 glitch 截圖：色塊 56%、雜訊 17%、局部重複 12%、殘影 6%、缺件 3%、文字 2%、過曝 2%、黑邊 2%。

### 0.5 本報告選的五類與對應
| 主題 | 對應 Truelove 類別 | 為什麼選 |
|---|---|---|
| 當機 | Crash | 最嚴重、最常復發 |
| 畫面渲染 | Game Graphics（加看得見的 Collision、Position） | 第二常見、第二常復發；研究最多 |
| 時間性 | Lewis temporal 中跟動作、畫面變化有關的部分 | Lewis 最上層的一半；近兩年研究集中、成績最差 |
| 動作與互動 | Action、Triggered Event、Context State、Object Persistence | 常見、Triggered Event 常復發且嚴重；最難測 |
| 資訊與介面 | Information、User Interface | 最常見 |
不涵蓋：Audio、Implementation Response（卡頓除外）、Exploit、AI、Camera、Value、Interaction Between Object Properties、Bounds。

---

## 1. 當機
**定義**：遊戲當掉或被迫關閉。580 次，38% 在緊急更新；最常復發。
**判斷需要**：不需要 oracle；難在走到與重現、以及上線後排序。

### 做法
| 流派 | 代表 | 資料 | 關鍵數字 |
|---|---|---|---|
| 自動探索 agent（開發中） | Wuji（ASE 2019，網易）：演化 + 深度 RL | 4 款商業遊戲 1,349 個真實 bug 歸納出 4 種 oracle | 兩款遊戲找到 3 個未知 bug |
| | TITAN（arXiv 2509.22170 ⚠）：GPT-4o agent，三種 oracle（當機、任務卡住、超時） | 兩款商業 MMORPG、注入 bug | 任務完成率 / 注入 bug 偵測率：TITAN 95 / 82、Wuji 82 / 45.5、ReAct 83 / 45.5、人類 100 / 18；另找到 4 個新 bug，部署於 8 條 QA 流程。⚠ 內文說 9 個 bug、表格合計 15 個 |
| 從回報到重現（收到回報後） | AdbGPT（ICSE 2024，Android） | 48 份回報 | 自報 81.3%；重測 A（ReBL，73 份當機）74.0%；重測 B（BugRepro，151 份）36.4%；ReCDroid 45.8 / 45.2 / 25.2% |
| | BugCraft（ASE 2025）：LLM 整理步驟 → VLM agent 用 Minecraft 專用指令集執行 | BugCraft-Bench：Minecraft 單人當機回報 100 → 86 份可重現 | 端到端：GPT-4.1 34.9%、GPT-4o 30.2%；OpenAI 電腦操作 agent 25.5%；UI-TARS-1.5-7B 0%。步驟生成 57 對 / 29 錯（下錯指令 14、缺步驟 10、邏輯錯 9）；57 份正確步驟中執行成功 22 份；29 份錯誤步驟中 4 份被救回 |
| 當機紀錄分流（上線後） | Weeraddana、Habchi、McIntosh（ICSE SEIP 2025，Ubisoft） | Ubisoft 已上線遊戲的當機紀錄 | stack trace 相似度勝過 ML，找出超過一半的「病毒式」當機類型 |

### 缺口
- 遊戲版重現 benchmark 只有一款（Minecraft，86 份）。
- 每款遊戲都要寫操作介面；通用 agent 最好 25.5%。
- 遊戲需要空間推理和狀態相依，Android 的方法搬不過來。
- 回報本身不完整（100 份中 14 份人也重現不了）；LLM 步驟三分之一有錯。
- 自報和重測落差大（81% vs 36%）。
- 探索式測試多半在注入 bug 上量。
- 上線分流仍漏掉近一半病毒式當機。

---

## 2. 畫面渲染
**定義**：遊戲世界某個視覺部分渲染錯誤。第二常見、第二常復發。
**判斷需要**：多數一張截圖就夠。

### 做法
| 流派 | 代表 | 資料 | 關鍵數字 |
|---|---|---|---|
| 監督式（造壞畫面訓練） | EA SEED（AIIDE 2020）：引擎內弄壞貼圖，CNN | 自產 | 正常 + 4 種貼圖錯誤分類 86.8% |
| | GLIB（FSE 2021，網易）：改渲染程式碼產生 glitch | 測試 192 張真實 glitch | recall：只用真實截圖 0.563、規則（OwlEye 改編）0.677、規則（四種顏色）0.594、程式碼 + 規則 0.984、GLIB 0.990；precision 全部 ≥ 0.93（GLIB 1.00） |
| | Rifaat 等人 ⚠（Ontario Tech University，arXiv 2610.08593，2026-10）：3 款開源 Unity 遊戲裝 bug 注入器、11 位玩家遊玩，同一段最多 3 種 bug 同時出現 | 77,969 段 2 秒影片；5 類（邊界破洞、貼圖損壞、幾何損壞、深度裁切、深度衝突） | ResNet-BiLSTM F1 85.78%，勝過 I3D、3D ResNet；作者承認注入的 bug 可能缺少真實細節 |
| 只學正常畫面 | World of Bugs 自編碼器（Wilkins & Stathis 2022） | Unity 自製平台、10 種 bug、每種約 5 萬張 | PR-AUC：黑畫面 0.990、貼圖遺失 0.973、…、深度裁切 0.319、物體穿模 0.156 |
| 直接問 VLM | GlitchBench（CVPR 2024） | 593 glitch + 330 正常，205 款遊戲 | GPT-4V 43.4% |
| | VideoGameQA-Bench（NeurIPS 2025） | 1,000 張 Steam 截圖 | GPT-4o 82.8% |
| | Lu 等人 2508.04895 討論段小實驗（EA） | 100 張工業 FPS 截圖，好壞各半 | GPT-4o 46%（F1 0.52） |
| | Lu 等人 2603.22706 ⚠（EA） | 41 小時測試錄影、19,738 關鍵幀 | gpt-4.1-mini precision 0.50；加裁判最好 0.57（gpt-5-mini）；圖片檢索變差；抓到的 46.8% 是錯誤訊息文字 |
| | Celemin 等人（Sony，CoG 2026）穿模 | Godot 場景，500 張穿模 | 正常畫面從「容易」換成隨機：掉 9–15 點；換成最模稜兩可：掉 19–25 點 |
| 給參考畫面 | RefGlitch-Bench ⚠ | Godot 1,000 組 | 無參考 → 自動 → 人工：GPT-5 0.65 → 0.70 → 0.77、Qwen3-VL-8B 0.62 → 0.70 → 0.73、Ministral-3-8B 0.57 → 0.63 → 0.68、Gemma-3-12B 0.58 → 0.61 → 0.63（5 個模型中 4 個變好）；Gemini 3 Flash 0.67 → 0.59 → 0.63（變差）；自動選的參考 33.4% 本身有 glitch，誤報率 0.58 → 0.84 |
| | VideoGameQA-Bench 視覺回歸 | 250 組 | 最好 o4-mini 45.2% |
| 用文字找畫面 | Lu 等人 2508.04895 | 247 支 JIRA 影片 | Acc@1 0.89、F1 0.79；F1 依類別：光影 0.94、物理 0.86、UI 0.83、動畫特效 0.51 |

### 缺口
- 公開資料和開發現場落差：82.8% vs 46%。
- 監督式要每款遊戲的原始碼來產生訓練資料。
- GLIB 測試集的正常圖全來自訓練遊戲，沒量到跨遊戲誤報。
- 模稜兩可的正常畫面帶來大量誤報；EA 錄影 precision 約 0.50。
- 參考畫面可能本身是壞的。
- 回歸比對很弱（45.2%）。
- 動畫類最難；抓到的偏向最顯眼的文字。

---

## 3. 時間性 glitch
**定義**：Lewis temporal——要看前後才知道錯。研究實際處理的是動作層：閃爍、射擊時序、速度異常、動畫凍結、卡在原地（TempGlitch 五類），外加畫面停格。
**頻率**：語意層的 Interrupted Event 最少見之一；Event Occurrence、Interrupted Event 零復發；動作層沒有對應頻率資料。
**判斷需要**：一段影片。

### 做法
| 流派 | 代表 | 資料 | 關鍵數字 |
|---|---|---|---|
| 把影片交給 VLM | TempGlitch 前導（GPT-5、PhysGame 子集，各 50 支） | | recall 單張可見 vs 要看變化：I-frame 0.72 / 0.48、1 fps 0.74 / 0.68、2 fps 0.80 / 0.68 |
| | TempGlitch ⚠（Alberta + Sony 2026） | Godot 兩個範例、750 有 glitch + 750 刻意相似的正常 | 12 個模型 49–54%；1 → 5 fps 幾乎不變；precision 多在 50–68% |
| | TimeBlind（通用影片） | 成對影片只差時間結構 | 最強 48.2%，人類 98.2% |
| 只看正常影片 | Azizi & Zaman（CoG 2023）LSTM | 兩款 FPS | 無量化結果 |
| | Huynh & Pham ⚠（Zenodo 2026） | TempGlitch | VideoMAE 外觀距離 AUROC 0.69（最佳）；各類：VideoMAE 0.64–0.75；V-JEPA 2 動畫凍結 0.396；LeWM 最差；有效秩 1.13 → 21.30 但 AUROC 無改善 |
| 分步推理 + 定位 | GELID（EMSE 2023） | 3 款遊戲、604 片段 | 切片段、分群不錯；分類有限 |
| | VideoGlitchBench ⚠（ACM MM 2026） | 120 款、5,238 支影片 | GliDe 讓開源模型 F1 +19–27 點，最好 40.45%（UI-TARS-1.5-7B）；閉源直接問最好 26.0% |
| 相鄰畫面比較 | HASTE（ICSE 2025）停格 | 105 支實況影片 | precision 89%、recall 71% |

### 缺口
- VLM 接近隨機，加 fps、讀原始影片、換大模型都沒用。
- 影片模型共通的時間盲。
- 每種算法都有盲點（預測式看不到凍結）。
- 最佳 AUROC 0.69；5% 誤報門檻下沒有偵測器抓到超過兩成。
- 公開資料是注入的、一個引擎兩個場景；只有影片層級標籤。
- 真實頻率證據不足。

---

## 4. 動作與互動
**定義**：Action、Triggered Event、Context State（加 Object Persistence）。Action 第三常見；Triggered Event 第三常復發、嚴重度前段。
**判斷需要**：影片 + 玩家輸入；很多問題只看畫面原理上分不出來。

### 做法
| 流派 | 代表 | 資料 | 關鍵數字 |
|---|---|---|---|
| RL 與演化探索 | Wuji | | 見當機 |
| | Bergdahl 等人（EA，CoG 2020） | 自製沙盒關卡 | RL agent 學會穿過缺碰撞的牆，找到 5 個預放卡點；每秒約 3 萬動作 |
| | GBGallery（EMSE 2022） | 5 款商業遊戲、76 個真實工業 bug（只有執行檔） | 基線：隨機、DQN、A2C、好奇心 A2C、Wuji；結論「還在很早期」 |
| 好奇心 / 新奇度 | Gordillo 等人（EA 2021） | 500 m 見方地圖、320 agent | 約 24 小時走遍 90%，找到預放卡點與出界 |
| | SMART ⚠（arXiv 2512.12706，2025-12）：LLM 讀程式碼改動推測更新意圖，給 RL agent 混合獎勵 | Overcooked、Minecraft | 改動的程式分支覆蓋 >94%（約傳統 RL 兩倍），任務完成率 98% |
| 不靠玩去走到 | GameGen-Verifier ⚠（arXiv 2605.07442，2026-05）：把規格拆成要點，直接改寫執行中的狀態跳到要測的情境再判斷 | VeriGame：100 款 LLM 生成遊戲 | 與人工判斷一致率最高 92.2%，從頭玩到該情境的 agent 58.8% |
| | ACGB 探索 ⚠（Huynh & Pham） | 5 款 64×64 小遊戲、每款 80 個有 bug 關卡 | 觸發 / 找到：隨機 0.435 / 0.322、腳本 0.465 / 0.355、計數 0.380 / 0.338、RND 0.297 / 0.270、驚訝 0.275 / 0.258；每千步誤報：隨機 20.3、驚訝 297.4 |
| LLM agent | GBQA ⚠（ICLR 2026 workshop） | 30 款生成遊戲、124 個注入 bug | recall 一般 → 推理：Claude-4.6-Opus 37.90 → 48.39%；Qwen3-8B 10.48 → 24.19%；步數 50 → 500：22.58 → 37.90% |
| | TITAN | | 見當機 |
| 把輸入納入判斷 | ACGB 偵測 ⚠ | 8 種注入 glitch，含卡在原地、按鍵錯亂 | 平均 / 按鍵錯亂 AUROC：VideoMAE 0.639 / 0.420；V-JEPA 2 0.706 / 0.518；像素預測不加輸入 0.783 / 0.531；加輸入 0.888 / 0.867；LeWM 加輸入 0.605 / 0.458 |

### 缺口
- 「沒找到」分不出是沒走到還是沒認出（ACGB：隨機策略觸發的 bug 有 0.718 被認出）。
- 只看畫面原理上有盲區。
- 好奇心目標會把 agent 帶偏。
- 困難 bug 要很長的序列（GBQA 500 步未飽和）。
- 評測 bug 幾乎都是注入的。
- 幾乎沒有公開可用資料（GBQA、ACGB 未公開；GBGallery 只有執行檔；World of Bugs 停止維護）。

---

## 5. 資訊與介面
**定義**：Information（資訊沒有正確傳達，最常見）、User Interface。兩種錯：**呈現壞了**（重疊、溢出、截斷，看畫面就知道）；**內容錯了**（數值、說明、名稱、字幕，需要正確答案）。
**判斷需要**：呈現壞了→截圖；內容錯了→另一個資訊來源。

### 做法
| 流派 | 代表 | 資料 | 關鍵數字 |
|---|---|---|---|
| 截圖找版面異常 | OwlEye（ASE 2020，app） | | precision / recall 約 85% |
| | Nighthawk（TSE，app） | Google Play、F-Droid | 151 個新問題，75 個確認或修正 |
| | AG3（FSE 2023 Industry，ByteDance） | 重疊 55、溢出 288 張，各配 1,658 正常 | 重疊 P / R：AG3 94.34 / 90.91、GLIB 14.29 / 7.27；溢出：AG3 81.03 / 97.92、GLIB 4.00 / 0.35；部署兩年找到 2,000+ 文字問題 |
| 跨媒介比對 | ECHOTEST（IEEE ToG） | 15 款遊戲影片；合成困難資料 | 真實 P 98% / R 89%；合成 P 73% / R 99% |
| 讓 VLM 讀畫面 | VideoGameQA-Bench UI 單元測試 | 100 張 | 最好 40%（一般視覺單元測試 53%） |
| | Lu 等人 2508.04895 | | UI / HUD 類找畫面 F1 0.83 |

### 缺口
- 「內容寫錯」的答案不在畫面上；除了字幕，沒找到處理數值、說明、名稱錯誤的自動化研究。
- 通用畫面偵測器看不到文字問題（GLIB recall 7% / <1%）。
- 美術字、圖片文字讓 OCR 失效。
- 沒測過的解析度、語系會出事。
- 遊戲領域沒有以文字 / 介面錯誤為主的公開資料集。
- 大型模型讀介面細節仍吃力（40%）。

---

## 6. 跨類別共同缺口
1. 評測 bug 多為研究者注入，少有真實頻率依據。
2. 同一批小場景反覆使用（Godot 範例：TempGlitch、Sony 穿模、RefGlitch；ACGB 64×64）。
3. 公開資料高估表現（82.8% → 46%；AdbGPT 81% → 36–74%）。
4. 「本來應該發生什麼」常不在畫面上（當機要步驟、互動要輸入、資訊要正確值）。
5. 最好的資料在業界且封閉。
6. 近一年的關鍵結果多是預印本。

## 7. 缺口 → 方向（對照 directions.html）
| 方向 | 補的缺口 | Benchmark / Baseline |
|---|---|---|
| 一、單一遊戲用 mutation 微調 VLM | 畫面：公開 vs 開發現場落差；監督式要每款遊戲做資料 | 部分 / 有 |
| 二、互動 bug：agent + 內部狀態 | 互動：只看畫面有盲區、沒走到 vs 沒認出 | 部分 / 部分 |
| 三、時間性 glitch 偵測與定位 | 時間性：VLM 接近隨機 | 有 / 有 |
| 四、資訊內容錯誤：顯示值 vs 內部值 | 資訊：答案不在畫面上 | 缺 / 缺 |
| 五、VLM 在正常畫面上的誤報 | 畫面：模稜兩可的正常畫面、precision 0.50 | 有 / 有 |
| 六、當機重現 | 當機：只有 Minecraft 一個 benchmark | 部分 / 有 |
| 七、真實 bug 實證分析 | 共同：注入 bug 缺真實頻率依據 | 不適用 |

## 8. 2026-11-24 新增查到的論文
- 已加入頁面：Rifaat 等人 2610.08593（畫面）、SMART 2512.12706 與 GameGen-Verifier 2605.07442（互動）、Zhang 等人 2501.11782（總覽：為什麼要自動化）。
- 查到但沒加入（主題不是找 bug）：GameReplica 2609.22308（黑箱重現遊戲）、MineExplorer 2605.30931（開放世界探索）、PlayCraft 2611.26624（依遊玩經驗改設計）。
- 每個主題頁最下面新增「可行方向」，內容取自 directions.html。
