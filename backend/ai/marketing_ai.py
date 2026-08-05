import sys
import json
import datetime
import pandas as pd
import numpy as np
from sklearn.cluster import KMeans
from sklearn.linear_model import LinearRegression
from sklearn.preprocessing import StandardScaler
from sklearn.feature_extraction.text import CountVectorizer
from sklearn.naive_bayes import MultinomialNB
from sklearn.ensemble import RandomForestRegressor

def load_input_data():
    try:
        # Read from stdin
        input_data = sys.stdin.read()
        if not input_data.strip():
            return {}
        return json.loads(input_data)
    except Exception as e:
        print(json.dumps({"error": f"Failed to parse stdin: {str(e)}"}))
        sys.exit(1)

def run_segmentation(data):
    # Inputs: list of customers
    customers = data.get("customers", [])
    if not customers:
        return {"customers": [], "stats": {}}

    df = pd.DataFrame(customers)
    
    # Feature columns
    feature_cols = ["total_spend", "visit_count", "age"]
    
    # Clean and fill NA
    for col in feature_cols:
        if col not in df.columns:
            df[col] = 0
        df[col] = pd.to_numeric(df[col]).fillna(0)
    
    X = df[feature_cols].values
    
    # Normalize features
    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X)
    
    # Run KMeans with 3 clusters
    n_clusters = min(3, len(df))
    kmeans = KMeans(n_clusters=n_clusters, random_state=42, n_init=10)
    df["cluster"] = kmeans.fit_predict(X_scaled)
    
    # Map cluster numbers to semantic labels based on average spend
    cluster_means = df.groupby("cluster")["total_spend"].mean().sort_values()
    
    # Mapping based on sorted spending averages
    labels = ["Churn-Risk", "Regular", "High-Value"]
    label_map = {}
    for idx, cluster_id in enumerate(cluster_means.index):
        label_map[cluster_id] = labels[idx] if idx < len(labels) else "Regular"
        
    df["segment"] = df["cluster"].map(label_map)
    
    # Prepare statistics
    stats = {}
    for cluster_id, segment_name in label_map.items():
        sub_df = df[df["cluster"] == cluster_id]
        stats[segment_name] = {
            "count": int(len(sub_df)),
            "average_spend": float(sub_df["total_spend"].mean()),
            "average_visits": float(sub_df["visit_count"].mean()),
            "average_age": float(sub_df["age"].mean())
        }
        
    # Format output
    result_customers = []
    for _, row in df.iterrows():
        cust = row.to_dict()
        # Convert numeric types from numpy to native python
        for k, v in cust.items():
            if isinstance(v, (np.int64, np.int32)):
                cust[k] = int(v)
            elif isinstance(v, (np.float64, np.float32)):
                cust[k] = float(v)
        result_customers.append(cust)
        
    return {
        "customers": result_customers,
        "stats": stats
    }

def run_prediction(data):
    campaign = data.get("campaign", {})
    historical = data.get("historical_campaigns", [])
    
    budget = float(campaign.get("budget", 10000))
    channel = campaign.get("channel", "Social Media")
    
    # Encodings for channels
    channel_map = {
        "Social Media": 1,
        "POS Coupons": 2,
        "CRM System Data": 3,
        "Google Analytics": 4,
        "Website Analytics": 5
    }
    channel_code = channel_map.get(channel, 0)
    
    # Heuristics based on seed patterns
    channel_fallbacks = {
        "Social Media": {"ctr": 0.06, "conv": 0.15, "imps_per_rupee": 0.14, "aov": 310},
        "POS Coupons": {"ctr": 0.25, "conv": 0.60, "imps_per_rupee": 0.05, "aov": 220},
        "CRM System Data": {"ctr": 0.12, "conv": 0.35, "imps_per_rupee": 0.10, "aov": 310},
        "Google Analytics": {"ctr": 0.05, "conv": 0.18, "imps_per_rupee": 0.12, "aov": 310},
        "Website Analytics": {"ctr": 0.08, "conv": 0.22, "imps_per_rupee": 0.11, "aov": 310}
    }
    fallback = channel_fallbacks.get(channel, {"ctr": 0.07, "conv": 0.20, "imps_per_rupee": 0.10, "aov": 280})
    
    # If historical data is provided, fit a simple regression model to blend with fallbacks
    if len(historical) >= 3:
        try:
            hist_df = pd.DataFrame(historical)
            hist_df["channel_code"] = hist_df["channel"].map(channel_map).fillna(0)
            
            X_train = hist_df[["budget", "channel_code"]].values
            
            # Predict impressions
            y_imps = hist_df["impressions"].values
            model_imps = LinearRegression().fit(X_train, y_imps)
            pred_imps = model_imps.predict([[budget, channel_code]])[0]
            
            # Predict clicks
            y_clicks = hist_df["clicks"].values
            model_clicks = LinearRegression().fit(X_train, y_clicks)
            pred_clicks = model_clicks.predict([[budget, channel_code]])[0]
            
            # Predict conversions
            y_convs = hist_df["pos_sales_conversions"].values
            model_convs = LinearRegression().fit(X_train, y_convs)
            pred_convs = model_convs.predict([[budget, channel_code]])[0]
            
            # Bound models to avoid negative regression extrapolations
            pred_imps = max(pred_imps, budget * fallback["imps_per_rupee"] * 80)
            pred_clicks = max(pred_clicks, pred_imps * fallback["ctr"] * 0.7)
            pred_convs = max(pred_convs, pred_clicks * fallback["conv"] * 0.7)
            
        except Exception as e:
            # Fallback on exception
            pred_imps = budget * fallback["imps_per_rupee"] * 100
            pred_clicks = pred_imps * fallback["ctr"]
            pred_convs = pred_clicks * fallback["conv"]
    else:
        # Standard fallback calculation
        pred_imps = budget * fallback["imps_per_rupee"] * 100
        pred_clicks = pred_imps * fallback["ctr"]
        pred_convs = pred_clicks * fallback["conv"]

    # Final calculations
    pred_imps = int(round(pred_imps))
    pred_clicks = int(round(pred_clicks))
    pred_convs = int(round(pred_convs))
    
    predicted_ctr = float(pred_clicks / pred_imps) if pred_imps > 0 else 0.0
    predicted_conversion_rate = float(pred_convs / pred_clicks) if pred_clicks > 0 else 0.0
    
    attributed_revenue = float(round(pred_convs * fallback["aov"], 2))
    net_roi = float(round(attributed_revenue - budget, 2))
    efficiency_ratio = float(round(attributed_revenue / budget, 2)) if budget > 0 else 0.0
    
    return {
        "channel": channel,
        "budget": budget,
        "predicted_impressions": pred_imps,
        "predicted_clicks": pred_clicks,
        "predicted_conversions": pred_convs,
        "predicted_ctr": float(round(predicted_ctr * 100, 2)),
        "predicted_conversion_rate": float(round(predicted_conversion_rate * 100, 2)),
        "attributed_revenue": attributed_revenue,
        "net_roi": net_roi,
        "roas": efficiency_ratio,
        "effectiveness_tag": "High Performance" if efficiency_ratio >= 2.0 else "Moderate Performance" if efficiency_ratio >= 1.0 else "Low Performance"
    }

def run_sentiment_analysis(data):
    comments = data.get("comments", [])
    if not comments:
        return {"sentiment_distribution": {"Positive": 0, "Neutral": 0, "Negative": 0}, "average_sentiment_score": 0.5, "comments": []}

    # Internal training corpus for CountVectorizer + Naive Bayes
    train_texts = [
        "love the coffee", "best espresso in town", "great service and friendly staff", 
        "super tasty croissant", "cozy atmosphere, highly recommend", "love their cold brew", 
        "amazing experience, will return", "great flavor", "perfect place", "love the vibe", 
        "super fast billing", "tasty sandwiches and nice tea",
        "worst coffee ever", "slow service, very disappointed", "cold cappuccino, bad taste", 
        "staff was rude and unhelpful", "overpriced and dirty tables", "burnt espresso beans", 
        "bad quality food and slow", "never coming back", "cramped space and noisy", "stale cookies"
    ]
    # 1 for positive, 0 for negative
    train_labels = [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]

    vectorizer = CountVectorizer(binary=True, min_df=1)
    X_train = vectorizer.fit_transform(train_texts)
    
    clf = MultinomialNB()
    clf.fit(X_train, train_labels)

    results = []
    pos_count, neu_count, neg_count = 0, 0, 0
    total_score = 0.0

    for comment in comments:
        text = comment.get("text", "")
        # Clean text
        text_vec = vectorizer.transform([text.lower()])
        # Get probability of class 1 (positive)
        prob_pos = float(clf.predict_proba(text_vec)[0][1])
        
        # Classify
        if prob_pos >= 0.60:
            sentiment = "Positive"
            pos_count += 1
        elif prob_pos <= 0.40:
            sentiment = "Negative"
            neg_count += 1
        else:
            sentiment = "Neutral"
            neu_count += 1
            
        total_score += prob_pos
        results.append({
            "id": comment.get("id"),
            "text": text,
            "sentiment": sentiment,
            "score": float(round(prob_pos, 2))
        })
        
    avg_score = float(round(total_score / len(comments), 2)) if comments else 0.5

    return {
        "sentiment_distribution": {
            "Positive": pos_count,
            "Neutral": neu_count,
            "Negative": neg_count
        },
        "average_sentiment_score": avg_score,
        "comments": results
    }

def run_forecast(data):
    history = data.get("daily_metrics", [])
    if not history:
        return []

    df = pd.DataFrame(history)
    df["recorded_date"] = pd.to_datetime(df["recorded_date"])
    df = df.sort_values("recorded_date")
    
    # Feature engineering: index days
    df["day_index"] = np.arange(len(df))
    df["day_of_week"] = df["recorded_date"].dt.dayofweek
    
    # Target columns
    if "pos_sales_conversions" not in df.columns:
        df["pos_sales_conversions"] = 0
    df["pos_sales_conversions"] = pd.to_numeric(df["pos_sales_conversions"]).fillna(0)
    
    # Train random forest regressor
    X = df[["day_index", "day_of_week"]].values
    y = df["pos_sales_conversions"].values
    
    rf = RandomForestRegressor(n_estimators=30, random_state=42)
    rf.fit(X, y)
    
    # Predict next 14 days
    last_date = df["recorded_date"].max()
    last_idx = df["day_index"].max()
    
    predictions = []
    for d in range(1, 15):
        next_date = last_date + datetime.timedelta(days=d)
        next_idx = last_idx + d
        next_dow = next_date.dayofweek
        
        pred_conv = rf.predict([[next_idx, next_dow]])[0]
        
        # Weekend boost (additional 20% on Saturdays & Sundays)
        if next_dow in [5, 6]:
            pred_conv *= 1.22
            
        pred_conv = max(0, int(round(pred_conv)))
        
        # Estimate revenue at standard ₹280 average conversion AOV
        est_revenue = float(round(pred_conv * 280.0, 2))
        
        predictions.append({
            "date": next_date.strftime("%Y-%m-%d"),
            "predicted_conversions": pred_conv,
            "predicted_revenue": est_revenue
        })
        
    return predictions

def run_recommendations(data):
    campaigns = data.get("campaigns", [])
    
    recommendations = []
    
    # Find channels and their average ROAS
    channel_spends = {}
    channel_revenues = {}
    
    for c in campaigns:
        chan = c.get("channel")
        budget = float(c.get("budget", 0))
        rev = float(c.get("attributed_revenue", 0))
        
        channel_spends[chan] = channel_spends.get(chan, 0) + budget
        channel_revenues[chan] = channel_revenues.get(chan, 0) + rev
        
    channel_roas = {}
    for chan in channel_spends:
        spend = channel_spends[chan]
        rev = channel_revenues[chan]
        channel_roas[chan] = (rev / spend) if spend > 0 else 0
        
    # Generate recommendations
    rec_id = 1
    
    # 1. Budget reallocation recommendation if there's underperforming and high-performing channels
    underperforming = [ch for ch, roas in channel_roas.items() if roas < 1.1 and channel_spends[ch] > 0]
    highperforming = [ch for ch, roas in channel_roas.items() if roas > 1.8]
    
    if underperforming and highperforming:
        src = underperforming[0]
        tgt = highperforming[0]
        shift_amt = float(round(channel_spends[src] * 0.35, 2))
        
        if shift_amt > 2000:
            recommendations.append({
                "id": rec_id,
                "type": "Budget Reallocation",
                "priority": "High",
                "campaign_id": None,
                "description": f"Shift ₹{shift_amt:,.2f} of marketing budget from underperforming '{src}' channel to high ROAS '{tgt}' channel to optimize margins.",
                "reallocation_details": {
                    "source_channel": src,
                    "target_channel": tgt,
                    "shift_amount": shift_amt
                },
                "estimated_roi_impact": "+18.4% Net ROI"
            })
            rec_id += 1
            
    # 2. General optimization tips for campaigns
    for c in campaigns:
        if c.get("status") != "Active":
            continue
            
        roas = (float(c.get("attributed_revenue", 0)) / float(c.get("budget", 1))) if float(c.get("budget", 0)) > 0 else 0
        
        if roas < 1.0:
            recommendations.append({
                "id": rec_id,
                "type": "Targeting Adjustment",
                "priority": "Medium",
                "campaign_id": c.get("id"),
                "description": f"Refine customer segments for '{c.get('name')}' on {c.get('channel')}. Exclude low-engagement age brackets to reduce waste spend.",
                "reallocation_details": None,
                "estimated_roi_impact": "+12.1% Efficiency"
            })
            rec_id += 1
        elif roas > 2.2:
            recommendations.append({
                "id": rec_id,
                "type": "Budget Reallocation",
                "priority": "High",
                "campaign_id": c.get("id"),
                "description": f"Allocate additional ₹10,000 budget boost to high performing '{c.get('name')}' campaign. The channel exhibits strong volume capacity.",
                "reallocation_details": {
                    "source_channel": "HQ General Reserve",
                    "target_channel": c.get("channel"),
                    "shift_amount": 10000
                },
                "estimated_roi_impact": "+24.5% Attributed Sales"
            })
            rec_id += 1

    # Fallback default if no recommendations generated
    if not recommendations:
        recommendations.append({
            "id": rec_id,
            "type": "Targeting Adjustment",
            "priority": "Low",
            "campaign_id": None,
            "description": "Launch hyper-local coupons Targeting the high-value segment in Indiranagar flagship outlet on weekends.",
            "reallocation_details": None,
            "estimated_roi_impact": "+8.5% Engagement"
        })
        
    return recommendations

def main():
    if len(sys.argv) < 2:
        print(json.dumps({"error": "No task specified. Available: check, segmentation, predict, sentiment, forecast, recommendations"}))
        sys.exit(1)
        
    task = sys.argv[1]
    
    if task == "check":
        # Check task to verify file runs and outputs correctly
        print(json.dumps({"status": "ready", "python_version": sys.version}))
        sys.exit(0)
        
    input_data = load_input_data()
    
    result = {}
    if task == "segmentation":
        result = run_segmentation(input_data)
    elif task == "predict":
        result = run_prediction(input_data)
    elif task == "sentiment":
        result = run_sentiment_analysis(input_data)
    elif task == "forecast":
        result = run_forecast(input_data)
    elif task == "recommendations":
        result = run_recommendations(input_data)
    else:
        result = {"error": f"Unknown task: {task}"}
        
    print(json.dumps(result))

if __name__ == "__main__":
    main()
