# Route-Specific Components

This directory contains route-specific components prefixed with underscore as specified in .cursorrules.

## Structure

Route-specific components that are only used within specific app routes should be placed here, organized by the route they belong to.

Examples:
- `_dashboard-welcome.tsx` - Welcome component for dashboard page
- `_transaction-summary.tsx` - Summary component for transaction page  
- `_profile-settings.tsx` - Settings component for profile page

Components here should be co-located with the routes that use them for better organization and maintainability.