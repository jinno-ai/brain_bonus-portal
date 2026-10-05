# brain_bonus-portal

Brain 販売商品の**購入者特典配布ポータル**（静的・ビルドなし・GitHub Pages）。

- 設計の正本 = `business_notes/横断/2026-10-05-購入者特典配布口設計.md`（私有文書リポ・ここでは複製しない）
- 特典素材の完成物の正本 = `brain_ops-content`（Linux 側）
- 出品改訂（入口の添付差し替え）の画面操作 = `tas_nexus_cx_starter/docs/brain-ops/01-listing-runbook.md`

## 仕組み

- `index.html` 内 `SKUS` 配列が商品ごとのセクション（タイトル・キーハッシュ・特典一覧）を持つ。
- キー照合は SHA-256 ハッシュ比較（Web Crypto）。**平文キーは本リポに置かない**。キーの正本 = 設計正本の §キー台帳。
- 特典の `status: "準備中"` はリンクなし表示。実配布時は `url` に置き換える。

## 運用手順

### 特典を追加・差し替える

1. `SKUS` の該当 SKU `items` を編集（準備中 → `url` 付き、または項目追加）。
2. 配布ファイル本体は本リポに置かず外部URL（または `files/` 配下が必要な場合のみ同梱して相談）を指す。
3. commit & push で即時反映（Brain 審査は不要）。

### キーを交換する（漏洩時）

1. 新キーを生成: `echo -n "brain012-$(openssl rand -hex 6)"`（接頭辞 `brain<SKU番号>-`）。
2. ハッシュを計算: `echo -n "<新キー>" | shasum -a 256`。
3. ハッシュを `SKUS[].keyHash` に置き換えて push。
4. 設計正本の §キー台帳を更新し、該当 SKU の添付「特典受取案内」を差し替え出品（tas_nexus_cx_starter runbook の手順）。

## 公開

- GitHub Pages（main / root）: `https://jinno-ai.github.io/brain_bonus-portal/`
