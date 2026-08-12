-- Marketing Agent Database Migration (MySQL DDL)

-- 1. Create Customers Table
CREATE TABLE IF NOT EXISTS `customers` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(100) NOT NULL,
  `email` VARCHAR(150) NOT NULL UNIQUE,
  `phone` VARCHAR(20) DEFAULT NULL,
  `age` INT DEFAULT NULL,
  `gender` VARCHAR(20) DEFAULT NULL,
  `total_spend` DECIMAL(12, 2) DEFAULT 0.00,
  `visit_count` INT DEFAULT 0,
  `calculated_engagement_score` DECIMAL(5, 2) DEFAULT 0.00,
  `segment` VARCHAR(50) DEFAULT 'Standard',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_customers_email` (`email`),
  INDEX `idx_customers_segment` (`segment`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. Create Campaigns Table
CREATE TABLE IF NOT EXISTS `campaigns` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(150) NOT NULL,
  `channel` VARCHAR(50) NOT NULL,
  `start_date` DATE NOT NULL,
  `end_date` DATE NOT NULL,
  `budget` DECIMAL(12, 2) NOT NULL,
  `status` VARCHAR(30) NOT NULL DEFAULT 'Draft',
  `targeted_segments` TEXT DEFAULT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_campaigns_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. Create Marketing Metrics Table
CREATE TABLE IF NOT EXISTS `marketing_metrics` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `campaign_id` INT NOT NULL,
  `clicks` INT DEFAULT 0,
  `impressions` INT DEFAULT 0,
  `pos_sales_conversions` INT DEFAULT 0,
  `sentiment_score` DECIMAL(3, 2) DEFAULT 0.00,
  `coupon_redemptions` INT DEFAULT 0,
  `recorded_date` DATE NOT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`campaign_id`) REFERENCES `campaigns` (`id`) ON DELETE CASCADE,
  INDEX `idx_metrics_campaign_id` (`campaign_id`),
  INDEX `idx_metrics_recorded_date` (`recorded_date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. Create ROI Reports Table
CREATE TABLE IF NOT EXISTS `roi_reports` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `campaign_id` INT NOT NULL,
  `total_spend` DECIMAL(12, 2) NOT NULL,
  `attributed_revenue` DECIMAL(12, 2) NOT NULL,
  `net_roi` DECIMAL(12, 2) NOT NULL,
  `efficiency_ratio` DECIMAL(8, 2) NOT NULL,
  `calculated_timestamp` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`campaign_id`) REFERENCES `campaigns` (`id`) ON DELETE CASCADE,
  INDEX `idx_roi_reports_campaign_id` (`campaign_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
