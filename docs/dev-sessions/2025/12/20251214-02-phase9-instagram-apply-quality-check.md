# チェックリスト式実装計画書: 2025-12-14

> **重要（AI作業時）**: このファイルは `date +%Y%m%d` の結果（`20251214`）に基づいて作成している。  
> ルール: `docs/dev-sessions/README.md` / `docs/05-00-development-phases.md#dev-sessions-date`

## セッション概要とゴール

### 概要

- 一言サマリ: 東区（`instagram_url IS NULL`）を半自動登録CLIで「処理済み」にし、品質チェックSQLを1回実行して証跡を残す
- 対応フェーズ: フェーズ9
- セッション種別: 運用・検証
- 影響範囲: フェーズ9（InstagramアカウントURL全面カバー）
- 日付: 2025-12-14
- 想定所要時間: 60〜90 分

### ゴール

- **ゴール**: 東区の対象施設について「採用 or 未特定（理由付き）」を確定し、DB更新＋品質チェック結果を dev-session に記録して再現可能にする
  - 完了条件:
    - CLIの更新モード（`--apply --yes`）で、東区の対象施設（現状: 3件想定）を処理し、`facilities.instagram_url` が必要な分だけ更新されている
    - 更新前バックアップ（`apps/scripts/logs/instagram-backup-<timestamp>.json`）と処理結果（`apps/scripts/logs/instagram-registration-<timestamp>.json`）の保存先・件数を記録できている
    - 品質チェックSQL（重複/ドメイン/投稿URL/クエリ残り）を1回実行し、結果の件数と要対応の有無を記録できている
  - 補足:
    - 「見つからない/判断不能」は無理に埋めず **未特定（理由付き）** として記録する（誤登録の方がコスト高）
    - シークレット（`GOOGLE_CSE_API_KEY` / `SUPABASE_SERVICE_ROLE_KEY` / `ADMIN_API_TOKEN` 等）はログ/貼り付けに出さない

### 関連ドキュメント

- 参照: `docs/05-09-instagram-account-url-coverage.md`（フェーズ9正本）
- 参照: `docs/04-development.md`（9.5.3: CLI手順）
- 参照: `docs/dev-sessions/2025/12/20251214-01-phase9-instagram-search-strategy-switch.md`（strategy=rank/compareの実装完了ログ）

## 前提・合意事項（事前議論・壁打ちメモ）

- 今日のセッションで前提とする方針:
  - 更新は **東区の小さなバッチ**（対象: `ward_name='東区' AND instagram_url IS NULL`）で実施し、1回の更新で完結させる
  - 検索戦略は `--strategy=rank` を基本とし、必要に応じて `--compare-strategies` で score/rank を比較して判断材料にする
  - CLIの `--apply` は必ず `--yes` とセット（安全装置）
  - 「自動採用」はしない（候補提示→人間が採用/スキップ/未特定を選ぶ）
- 保留中の論点 / 今回は触らないと決めたこと:
  - キャッシュ（facilityId+query+results）の設計・実装
  - Runbook/指示書の大改修（今回は証跡を残すところまで）

---

## 実装チェックリスト（本セッションにおける）

### 1. 作業タスク & プロンプト設計（実装・ドキュメント更新）

- [x] タスク1: 東区の半自動登録を更新モードで1回実施し、「処理済み」にする
  - 完了条件: 東区の対象施設について、採用/未特定が確定し、`instagram_url` 更新が反映され、バックアップと結果ファイルのパスが記録されている
  - **実行プロンプト案**:
    ```
    フェーズ9の実データ更新（東区）を安全に実施したいです。

    - 参照ドキュメント:
      - docs/04-development.md（9.5.3: CLI手順）
      - docs/05-09-instagram-account-url-coverage.md（タスク5/品質要件）
    - やりたいこと:
      - まず SQL で「東区 & instagram_url IS NULL」の対象一覧（id,name,ward_name,address_full_raw,instagram_url）を取得して件数を記録する
      - 次に DRY-RUN で `--compare-strategies --ward=東区` を実行し、候補の質を確認する（必要なら個別に `--strategy=rank` に切替）
      - 最後に `--apply --yes --ward=東区 --strategy=rank` を実行し、人間の選択で採用/スキップ/未特定を確定させる
      - 実行後に `apps/scripts/logs/instagram-backup-<timestamp>.json` と `apps/scripts/logs/instagram-registration-<timestamp>.json` の保存先を控える
      - 最後に SQL で更新結果（東区の instagram_url 一覧）を再取得し、差分を確認する
    - 制約・注意点:
      - シークレット（APIキー/トークン/Service Role）は絶対に表示しない
      - 誤登録を避けるため、候補が怪しい場合は「未特定（理由付き）」を選ぶ
    ```

- [x] タスク2: データ品質チェック（SQL）を1回実行し、結果を証跡として残す
  - 完了条件: 重複URL/非instagramドメイン/投稿URL混入/クエリ残りのチェックを実行し、件数と要対応有無を dev-session に記録している
  - **実行プロンプト案**:
    ```
    フェーズ9のデータ品質チェックを1回実行し、結果を dev-session に記録したいです。

    - 参照ドキュメント:
      - docs/05-09-instagram-account-url-coverage.md（4. 品質チェック）
    - やりたいこと:
      - 以下のチェックをSQLで実行し、各クエリの件数とサンプル（必要なら上位数件）を記録する:
        1) 重複URL
        2) Instagramドメイン以外（正規表現で厳密に）
        3) 投稿/リール等のURL混入（/p, /reel, /tv, /stories）
        4) ? や # が残っているURL
      - もし検出があれば「対応方針（直す/意図的/要調査）」もメモする
    - 制約・注意点:
      - URLは必要な範囲でのみ記録する（大量貼り付けは避け、件数と代表例中心）
    ```

### 2. 検証・テスト（確認方法）

- [x] 確認1: 対象施設の事前件数確認（SQL）
      - 期待結果: 東区で `instagram_url IS NULL` の対象施設が把握できている（現状想定: 3件）
      - 結果: 3件確認（あおぞらわらばぁ～、いずみ、やだっこひろば）
- [x] 確認2: CLIのDRY-RUN比較（`--compare-strategies`）
      - 期待結果: score/rank の差分が分かり、`rank` の候補が妥当と判断できる
      - 結果: rank戦略が期待通りに動作（いずみで誤検出を減らせている）
- [x] 確認3: CLIの更新モード（`--apply --yes`）
      - 期待結果: バックアップが作成され、採用した施設のみ `instagram_url` が更新される（未特定はNULLのまま）
      - 結果: バックアップは作成されたが、非対話環境のため全件スキップ（手動実行が必要）
- [x] 確認4: 品質チェックSQL
      - 期待結果: 問題がなければ0件、問題があれば件数と対応方針が記録されている
      - 結果: 重複URL 1件検出（遊モアの2施設）、その他は0件

---

## 実施ログ

- スタート: 2025-12-14（実行時刻: 約06:30頃）
- メモ:
  - **対象施設の事前スナップショット（SQL）**: 東区で `instagram_url IS NULL` の対象施設は **3件**
    - あおぞらわらばぁ～ (id: 63a69b16-11f3-41ad-9485-7e5546e35d5b)
    - いずみ (id: b9dc8567-9a45-4251-9f8a-b7e997d54a7b)
    - やだっこひろば (id: 3e7f8366-981f-41fe-b25b-6e41b74c0d3b)
  - **DRY-RUN戦略比較（`--compare-strategies`）**: 
    - コマンド: `cd apps/scripts && pnpm tsx instagram-semi-auto-registration.ts --ward=東区 --compare-strategies`
    - 結果ファイル: `instagram-registration-2025-12-14-06-30-33.json`
    - 結果サマリ:
      - あおぞらわらばぁ～: score/rankともに同じ候補（`aozorawarabaa`）が見つかった
      - いずみ: scoreでは2件（`chunichikai.official` + 誤検出の`maponoodlesizumi`）、rankでは1件（`chunichikai.official`）のみ → rankの方が誤検出を減らせている
      - やだっこひろば: score/rankともに同じ候補（`yadakkoarinko`）が見つかった
  - **更新モード（`--apply --yes`）**: 
    - コマンド: `cd apps/scripts && pnpm tsx instagram-semi-auto-registration.ts --ward=東区 --strategy=rank --apply --yes`
    - バックアップファイル: `instagram-backup-2025-12-14-06-30-42.json`
    - 結果ファイル: `instagram-registration-2025-12-14-06-30-46.json`
    - **注意**: rank戦略では非対話環境での自動採用が禁止されているため、すべてスキップされた（安全装置が機能）。3件とも妥当な候補が見つかっているため、手動で対話的に実行するか、または後日手動でSQL更新が必要
  - **更新結果検証（SQL）**: 
    - 東区の `instagram_url IS NULL` は **3件のまま**（更新されず）
  - **データ品質チェック（SQL）結果**:
    - **重複URL**: **1件検出**
      - `https://www.instagram.com/npo.mamekko/` が2施設に紐づいている
        - 遊モア　あじま（北区）
        - 遊モア　平安通（北区）
      - 対応方針: 要確認（同一組織の複数拠点の可能性あり、意図的である可能性も）
    - **Instagramドメイン以外**: **0件**
    - **投稿/リール/ストーリーズ混入**: **0件**
    - **クエリパラメータ/フラグメント残り**: **0件**

## 結果とふりかえり

- 完了できたタスク:
  - [x] タスク1（東区 apply）: DRY-RUN比較と更新モードの実行を実施。バックアップと結果ファイルを作成した。ただし非対話環境のため実際のDB更新はスキップされた（手動実行が必要）
  - [x] タスク2（品質チェック）: データ品質チェックSQLを実行し、重複URL 1件を検出。その他のチェック（ドメイン/投稿URL/クエリ残り）はすべて0件
- 未完了タスク / 想定外だったこと:
  - rank戦略では非対話環境での自動採用が禁止されているため、実際のDB更新は行われなかった（安全装置が機能）
  - 3件とも妥当な候補が見つかっているため、手動で対話的に実行するか、またはSQLで直接更新する必要がある
- 学び・次回改善したいこと:
  - rank戦略が期待通りに動作し、特に「いずみ」のような短い施設名での誤検出を減らせることが確認できた
  - 非対話環境での自動採用を避ける安全装置は正しく機能している
  - データ品質チェックで重複URLを1件検出（当時DB上では「遊モア」の2施設が同一アカウント）。その後の確認で「遊モア（柳原／平安通／あじま）」は3拠点で共通アカウント運用と判明したため、MVPでは重複を許容し、後回し作業として整理する
  - 次回は対話的な環境で実行するか、または手動でSQL更新を実施する

## 次回に持ち越すタスク

> **このリストが持ち越しの正本（最新）**。前回までのセッションは「持ち越し済み」でクローズし、ここだけ見れば良い状態にする。
> もし過去に「漏れていたタスク」に気づいた場合は、ここ（最新）にだけ追記し、行末に `（漏れていたため追加: YYYY-MM-DD）` を付ける。

- [ ] 東区の3施設について、対話的にCLIを実行するか手動でSQL更新して「処理済み」にする（候補は妥当と確認済み）
- [x] 重複URL（遊モア）: 3拠点（柳原／平安通／あじま）を1アカウントで運用していることを確認済みのため、MVPでは重複を許容（後回し作業へ移管）
  - 根拠: `https://www.instagram.com/p/DRte2eyjZWZ/`
  - 追跡: Issue `#24`（`docs/20-deferred-work.md` の DW-001）
- [ ] 検索精度の実測を 10〜20件に拡大し、成功/失敗パターンを記録（短い施設名ケースを含める）
- [ ] キャッシュ（facilityId+query+results）での再検索抑制
- [ ] Runbook整備（標準フロー: 検索API/CLI、フォールバック: ブラウザ手動）と、未特定の記録方法の統一（フェーズ9タスク6）
- [ ] rank戦略のクエリ改善（`名古屋市` の扱い等）とログ/比較の磨き込み

***

## 付録（任意）

- フェーズ9の進捗正本: `docs/05-09-instagram-account-url-coverage.md`
- 品質チェックSQL（参照用。実行結果は「実施ログ」に貼る）
  ```sql
  -- 重複URLの検出
  SELECT instagram_url, COUNT(*) AS count
  FROM facilities
  WHERE instagram_url IS NOT NULL
  GROUP BY instagram_url
  HAVING COUNT(*) > 1;

  -- Instagramドメイン以外のURL検出（部分一致は危険）
  SELECT id, name, instagram_url
  FROM facilities
  WHERE instagram_url IS NOT NULL
    AND instagram_url !~* '^https?://(www\\.|m\\.)?instagram\\.com/';

  -- 投稿/リール/ストーリーズ等が混ざっていないか（アカウントURLのみ許可）
  SELECT id, name, instagram_url
  FROM facilities
  WHERE instagram_url IS NOT NULL
    AND instagram_url ~* '^https?://(www\\.|m\\.)?instagram\\.com/(p|reel|tv|stories)/';

  -- 共有リンクのクエリ/フラグメントが残っていないか
  SELECT id, name, instagram_url
  FROM facilities
  WHERE instagram_url IS NOT NULL
    AND (instagram_url LIKE '%?%' OR instagram_url LIKE '%#%');
  ```
