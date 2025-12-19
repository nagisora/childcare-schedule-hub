# 20 後回し作業リスト（正本）

## 目的

MVP優先で「後で必ず対応する」事項を、**忘れずに回収する**ための正本リスト。

- **追跡（タスク管理）の正本**: GitHub Issue
- **仕様・運用方針の正本**: `docs/`（本ファイル、および必要に応じて各フェーズ正本）

このファイルは「後回し項目の一覧」と「記録ルール」を提供する。詳細議論や実装メモは基本的に Issue 側に寄せる。

## 運用ルール

- **後回しにする場合は必ず GitHub Issue を作る**（= 回収先）
- 本ファイルには **要点だけ**（なぜ後回しにしたか、いつ回収するか、どのIssueで追うか）
- dev-session に起点がある場合は **dev-session へリンク**も付ける
- 仕様として確定した事項は、本ファイルではなく **該当する仕様ドキュメントへ反映**する（本ファイルからはリンク）

## ステータス定義（目安）

- `deferred`: 後回し決定済み（MVP優先のため）
- `planned`: 対応方針が固まり、着手予定がある
- `in_progress`: 対応中
- `done`: 回収済み（Issue close 済み）

## 後回し項目一覧

| ID | ステータス | 概要 | 後回し理由 | 回収タイミング | 追跡 | メモ |
|---|---|---|---|---|---|---|
| DW-001 | deferred | 複数拠点が1つのInstagramアカウントを共有するケースの扱い整理（例外/データモデル/品質チェック） | 全国展開で頻出し得るが、MVPでは重複許容で前進する | MVPリリース後 | Issue: #24 | 根拠: `https://www.instagram.com/p/DRte2eyjZWZ/` / 記録: `docs/dev-sessions/2025/12/20251214-02-phase9-instagram-apply-quality-check.md` |
| DW-002 | deferred | 施設名（自動取得名称）と通称/別名（例: `おやこっこみなと 福田`）を分けて保持し、検索・判定に利用する設計 | 自動取得名称は括弧等で検索に不利。MVPではクエリvariants/一次ソース（詳細ページ記載）で前進し、名称モデル拡張は後回し | フェーズ9完了後（安定運用フェーズ） | Issue: #25 | 起点: `docs/dev-sessions/2025/12/20251216-02-phase9-instagram-search-hybrid-more-measurements.md`（L218） / 追跡: `https://github.com/nagisora/childcare-schedule-hub/issues/25` |
| DW-003 | deferred | MVP後に高性能AI（GPT-5.2 Extra High等）を活用してプロジェクト全体を棚卸し（設計/実装/ドキュメント/品質/セキュリティ） | MVPリリースを優先し、全体最適化・負債整理は後回しにする | MVPリリース後（落ち着いたタイミング） | Issue: #26 | 追跡: `https://github.com/nagisora/childcare-schedule-hub/issues/26` |
| DW-004 | deferred | デプロイ先の移行検討（Vercel → Cloudflare Pages 等のコスト最適化） | MVPリリース時はVercel Hobbyプランで「非商用利用」として公開可能（広告なし個人開発）。移行作業の負担を減らすためMVP後に延期 | MVPリリース後 | Issue: #27 | 参考: [デプロイ先比較資料](https://gemini.google.com/share/ec2dfff5cfa2) / 起点: `docs/05-00-development-phases.md` 旧フェーズ12 / 追跡: `https://github.com/nagisora/childcare-schedule-hub/issues/27` |
| DW-005 | deferred | `/api/instagram-search` の再検索抑制キャッシュ（facilityId+query+strategy+results）を設計・実装 | MVPリリースを優先。保存先/TTL/キー設計など影響が広く、設計を固めてから入れたい | MVPリリース後（安定運用フェーズ） | Issue: #28 | 起点: `docs/dev-sessions/2025/12/20251216-02-phase9-instagram-search-hybrid-more-measurements.md` / 決定: `docs/dev-sessions/2025/12/20251219-02-phase9-instagram-account-url-final-check-refactor.md` |
| DW-006 | deferred | `instagram-semi-auto-registration` の主要判断ロジック（採用/スキップ/未特定）をテスト可能に分離 | 全国対応で運用予定だが、MVPではCLIを使用しないため対応を見送る | 全国対応の着手前（MVP後） | Issue: #29 | 起点: `docs/dev-sessions/2025/12/20251219-02-phase9-instagram-account-url-final-check-refactor.md` / 決定: `docs/dev-sessions/2025/12/20251219-03-phase9-instagram-account-url-refactor.md` / 追跡: `https://github.com/nagisora/childcare-schedule-hub/issues/29` |
| DW-007 | deferred | フェーズ10のRunbookを「運用できる粒度」に引き上げ（登録ルール / 月次更新 / 品質チェック） | MVPリリース優先。現時点は手動運用でデータが揃っているため、リリース後に改善する | MVPリリース完了後、月次更新の運用負荷やデータ品質課題（更新漏れ/重複等）が顕在化したら着手 | Issue: #31 | 起点: `docs/dev-sessions/2025/12/20251219-05-phase10-docs-alignment.md` / 追跡: `https://github.com/nagisora/childcare-schedule-hub/issues/31` |

## 関連

- フェーズ9正本: `docs/05-09-instagram-account-url-coverage.md`
- dev-sessions: `docs/dev-sessions/`

