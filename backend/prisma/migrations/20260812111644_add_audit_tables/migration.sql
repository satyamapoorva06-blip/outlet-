-- CreateTable
CREATE TABLE "customers" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "age" INTEGER,
    "gender" TEXT,
    "total_spend" REAL NOT NULL DEFAULT 0.0,
    "visit_count" INTEGER NOT NULL DEFAULT 0,
    "calculated_engagement_score" REAL NOT NULL DEFAULT 0.0,
    "segment" TEXT NOT NULL DEFAULT 'Standard',
    "created_at" DATETIME DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "campaigns" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "channel" TEXT NOT NULL,
    "start_date" TEXT NOT NULL,
    "end_date" TEXT NOT NULL,
    "budget" REAL NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'Draft',
    "targeted_segments" TEXT,
    "created_at" DATETIME DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "marketing_metrics" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "campaign_id" INTEGER NOT NULL,
    "clicks" INTEGER NOT NULL DEFAULT 0,
    "impressions" INTEGER NOT NULL DEFAULT 0,
    "pos_sales_conversions" INTEGER NOT NULL DEFAULT 0,
    "sentiment_score" REAL NOT NULL DEFAULT 0.0,
    "coupon_redemptions" INTEGER NOT NULL DEFAULT 0,
    "recorded_date" TEXT NOT NULL,
    "created_at" DATETIME DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "marketing_metrics_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "campaigns" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "roi_reports" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "campaign_id" INTEGER NOT NULL,
    "total_spend" REAL NOT NULL,
    "attributed_revenue" REAL NOT NULL,
    "net_roi" REAL NOT NULL,
    "efficiency_ratio" REAL NOT NULL,
    "calculated_timestamp" DATETIME DEFAULT CURRENT_TIMESTAMP,
    "created_at" DATETIME DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "roi_reports_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "campaigns" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "audit_sessions" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "outlet_id" INTEGER NOT NULL,
    "auditor_name" TEXT NOT NULL,
    "audit_date" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'In Progress',
    "overall_score" REAL NOT NULL DEFAULT 0,
    "max_score" REAL NOT NULL DEFAULT 100,
    "pass_fail" TEXT NOT NULL DEFAULT 'Pending',
    "hygiene_score" REAL NOT NULL DEFAULT 0,
    "food_safety_score" REAL NOT NULL DEFAULT 0,
    "sop_score" REAL NOT NULL DEFAULT 0,
    "facility_score" REAL NOT NULL DEFAULT 0,
    "notes" TEXT,
    "created_at" DATETIME DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "audit_checklist_items" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "session_id" INTEGER NOT NULL,
    "category" TEXT NOT NULL,
    "question" TEXT NOT NULL,
    "answer" TEXT NOT NULL DEFAULT 'Pending',
    "score_weight" REAL NOT NULL DEFAULT 5,
    "notes" TEXT,
    "photo_url" TEXT,
    "created_at" DATETIME DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "audit_checklist_items_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "audit_sessions" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "audit_findings" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "session_id" INTEGER NOT NULL,
    "severity" TEXT NOT NULL,
    "finding_type" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'Open',
    "assigned_to" TEXT,
    "due_date" TEXT,
    "created_at" DATETIME DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "audit_findings_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "audit_sessions" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "audit_media_uploads" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "session_id" INTEGER NOT NULL,
    "item_id" INTEGER,
    "file_name" TEXT NOT NULL,
    "file_url" TEXT NOT NULL,
    "uploaded_at" DATETIME DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "audit_media_uploads_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "audit_sessions" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "audit_media_uploads_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "audit_checklist_items" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "audit_incidents" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "outlet_id" INTEGER NOT NULL,
    "session_id" INTEGER,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "incident_type" TEXT NOT NULL,
    "priority" TEXT NOT NULL DEFAULT 'Medium',
    "status" TEXT NOT NULL DEFAULT 'Open',
    "assigned_to" TEXT,
    "reported_date" TEXT NOT NULL,
    "resolved_date" TEXT,
    "created_at" DATETIME DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE UNIQUE INDEX "customers_email_key" ON "customers"("email");
