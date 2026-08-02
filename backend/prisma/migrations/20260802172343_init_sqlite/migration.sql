-- CreateTable
CREATE TABLE "outlets" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "outlet_name" TEXT NOT NULL,
    "manager_name" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "country" TEXT NOT NULL,
    "postal_code" TEXT,
    "latitude" REAL NOT NULL,
    "longitude" REAL NOT NULL,
    "is_active" BOOLEAN DEFAULT true,
    "created_at" DATETIME DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "sales" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "outlet_id" INTEGER NOT NULL,
    "sale_date" TEXT NOT NULL,
    "total_orders" INTEGER NOT NULL,
    "customer_count" INTEGER NOT NULL,
    "gross_revenue" REAL NOT NULL,
    "operating_cost" REAL NOT NULL,
    "net_profit" REAL NOT NULL,
    "average_order_value" REAL NOT NULL,
    "payment_cash" REAL NOT NULL,
    "payment_card" REAL NOT NULL,
    "payment_upi" REAL NOT NULL,
    "created_at" DATETIME DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "sales_outlet_id_fkey" FOREIGN KEY ("outlet_id") REFERENCES "outlets" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "users" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'MANAGER',
    "outlet_id" INTEGER,
    "created_at" DATETIME DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "users_outlet_id_fkey" FOREIGN KEY ("outlet_id") REFERENCES "outlets" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "inventory" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "outlet_id" INTEGER NOT NULL,
    "item_name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "current_stock" REAL NOT NULL,
    "min_threshold" REAL NOT NULL,
    "max_capacity" REAL NOT NULL,
    "unit" TEXT NOT NULL,
    "unit_price" REAL NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'In Stock',
    "last_restocked" TEXT,
    "created_at" DATETIME DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "inventory_outlet_id_fkey" FOREIGN KEY ("outlet_id") REFERENCES "outlets" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "staff" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "outlet_id" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "assigned_job" TEXT NOT NULL DEFAULT 'General Operations',
    "shift_type" TEXT NOT NULL,
    "login_time" TEXT NOT NULL DEFAULT '08:00 AM',
    "logoff_time" TEXT NOT NULL DEFAULT '04:30 PM',
    "hourly_rate" REAL NOT NULL,
    "hours_worked" REAL NOT NULL,
    "performance_rating" REAL NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'Active',
    "email" TEXT,
    "phone" TEXT,
    "created_at" DATETIME DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "staff_outlet_id_fkey" FOREIGN KEY ("outlet_id") REFERENCES "outlets" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");
