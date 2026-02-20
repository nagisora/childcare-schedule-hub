---
name: Implement Facility Schedules
overview: データベースにスケジュール（開所日時）を管理するテーブルを追加し、フロントエンドのUIにドクターズファイルのようなマトリックス型のテーブルを各拠点ごとに表示するように改修します。
todos:
  - id: create-migration
    content: データベースマイグレーションスクリプトの作成 (add_facility_schedules.sql)
    status: completed
  - id: update-types
    content: apps/web/lib/types.ts に FacilitySchedule 型を追加し、Facility 型を拡張
    status: completed
  - id: update-query
    content: apps/web/lib/facilities.ts の Supabase クエリを更新して facility_schedules を取得
    status: completed
  - id: update-ui
    content: apps/web/components/FacilitiesTable.tsx のUIをカード型＆マトリックステーブルにリファクタリング
    status: completed
isProject: false
---

# 実装計画：拠点ごとの開所スケジュールの追加

## 概要

ユーザーからの指示通り、PC/スマホ共通で見やすいドクターズ・ファイル風の「時間帯×曜日」のマトリックス型テーブルUIを実装します。将来的な検索機能（日曜日開所、18時以降開所など）に備え、DBには曜日ごとのフラグを持つ `facility_schedules` テーブルを新規作成します。

## 実装ステップ

### 1. データベースのマイグレーション作成

新しいリレーショナルテーブル `facility_schedules` を作成するSQLスクリプトを用意します。

- **対象ファイル**: `apps/scripts/migrations/add_facility_schedules.sql`
- **内容**:
  - `id` (UUID)
  - `facility_id` (UUID, 外部キー)
  - `open_time` (TIME)
  - `close_time` (TIME)
  - `monday` 〜 `sunday`, `holiday` (BOOLEAN, 各曜日の開所フラグ)
  - 検索用インデックスおよび RLSポリシーの追加

### 2. TypeScript の型定義の更新

フロントエンドで新しいテーブルのデータを扱えるように型定義を拡張します。

- **対象ファイル**: `apps/web/lib/types.ts`
- **内容**:
  - 新規の型 `FacilitySchedule` を定義。
  - 既存の `Facility` 型に `facility_schedules?: FacilitySchedule[]` を追加。

### 3. データ取得処理の更新

Supabaseから拠点を取得する際に、関連するスケジュール情報も一緒にJOINして取得するように変更します。

- **対象ファイル**: `apps/web/lib/facilities.ts`
- **内容**: `FACILITY_FIELDS_FOR_LIST` に `facility_schedules(id, open_time, close_time, monday, tuesday, wednesday, thursday, friday, saturday, sunday, holiday)` を追加。

### 4. UIコンポーネント（FacilitiesTable）の改修

現在の巨大な1つのテーブル構造を改め、各区ごとのリスト内に「拠点のカード」を並べるUIにリファクタリングします。

- **対象ファイル**: `apps/web/components/FacilitiesTable.tsx`
- **内容**:
  - 拠点ごとにカード型のUIコンポーネント（あるいは区切られたブロック）を作成し、拠点名とお気に入りボタンを配置。
  - カード内に、記号（●と－）を用いたコンパクトな「時間×曜日」のスケジュールマトリックステーブルを表示。
  - スマホでの閲覧時にも崩れないように `overflow-x-auto` などのTailwindクラスを付与し、余白を調整。

