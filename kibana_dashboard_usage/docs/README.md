{{- generatedHeader }}
{{/*
This template can be used as a starting point for writing documentation for your new integration. For each section, fill in the details
described in the comments.

Find more detailed documentation guidelines in https://www.elastic.co/docs/extend/integrations/documentation-guidelines
*/}}
# Kibana Dashboard Usage Integration for Elastic

## Overview
This package provides a pre-built "Kibana Content Insights" dashboard to visualize and understand how users interact with your Kibana dashboards. It queries Kibana's internal usage logs (`.kibana_usage_counters*`) and enriches that data with your saved object titles (`.kibana*`) to provide a clear, actionable view of your content's lifecycle.

This dashboard helps you answer key questions:
* What are our most popular, business-critical dashboards?
* Which dashboards are unused and can be safely deleted?
* Which teams or Kibana Spaces are the most active?

### Compatibility
This asset is designed for **Kibana versions 8.17 and later** as it relies on modern ES|QL features to function correctly.

## What data does this integration visualize?
This dashboard visualizes data from the following internal Kibana indices:

* **`.kibana_usage_counters*`**:
    * `usage-counter.count`: The number of views.
    * `usage-counter.counterName`: The ID of the dashboard being viewed.
    * `usage-counter.domainId`: The type of object (filtered to "dashboard").
    * `namespace`: The Kibana Space where the view occurred.
    * `updated_at`: The timestamp of the view.

### Supported use cases
* **Top Content Identification:** See a "Top 10" list of the most-viewed dashboards to identify business-critical content.
* **Unused Content Cleanup:** Identify dashboards with zero views over a long period (e.g., 90+ days) to confidently archive and delete them.
* **Usage Segmentation:** Break down dashboard usage by Kibana Space (`namespace`) to understand which teams are most active.

## How do I deploy this integration?
Deployment consists of installing this integration and everything wil be populated

### Validation
You can validate the installation by simply opening the dashboard.

1.  Navigate to the main **Dashboards** list in Kibana.
2.  Find and open the newly imported dashboard (e.g., "Kibana Content Insights").
3.  If the panels load with data, the installation is successful. If they are empty, see the Troubleshooting section.