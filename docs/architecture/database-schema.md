# データベーススキーマ

現在のSupabaseデータベース上の主要なテーブル構造とリレーションです。（最新のTypeScript型定義 `apps/web/lib/types.ts` およびマイグレーションに準拠）

## ER図

```mermaid
erDiagram
    facilities ||--o{ schedules : "1:N (has many)"
    facilities ||--o{ facility_schedules : "1:N (has many)"

    facilities {
        uuid id PK "Primary Key"
        text name "拠点名"
        text ward_name "区名"
        text address_full_raw "住所"
        text phone "電話番号"
        text instagram_url "InstagramアカウントURL"
        text website_url "公式サイトURL"
        text facility_type "拠点タイプ（応援/支援など）"
        text detail_page_url "詳細ページURL"
        timestamptz created_at
        timestamptz updated_at
    }

    schedules {
        uuid id PK
        uuid facility_id FK "facilities.id"
        text image_url "画像URL"
        text instagram_post_url "Instagram投稿URL"
        text embed_html "埋め込みHTML"
        date published_month "公開月(YYYY-MM-01)"
        text status "公開ステータス (published etc)"
        text notes "備考"
        timestamptz created_at
        timestamptz updated_at
    }

    facility_schedules {
        uuid id PK
        uuid facility_id FK "facilities.id"
        time open_time "開所時間 (HH:mm:ss)"
        time close_time "閉所時間 (HH:mm:ss)"
        boolean monday "月曜開所"
        boolean tuesday "火曜開所"
        boolean wednesday "水曜開所"
        boolean thursday "木曜開所"
        boolean friday "金曜開所"
        boolean saturday "土曜開所"
        boolean sunday "日曜開所"
        boolean holiday "祝日開所"
        timestamptz created_at
        timestamptz updated_at
    }
```

## テーブル詳細

### `facilities`
名古屋市内の保育拠点（応援・支援拠点）のマスターデータです。住所やSNSアカウントリンクなどを保持します。

### `facility_schedules`
各拠点の「通常開所スケジュール（曜日×時間帯）」のマスターデータです。1つの拠点が複数の開所パターン（例：平日と土曜で時間が違うなど）を持つため、`1:N` の構成になっています。

### `schedules`
拠点ごとの「月間予定表（画像やInstagram投稿）」データを保持します。`published_month` によって「何月分のスケジュールか」を管理し、月ごとに新しいレコードが作成されます。
