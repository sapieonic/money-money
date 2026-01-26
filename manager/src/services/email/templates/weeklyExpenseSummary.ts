/**
 * Weekly Expense Summary Email Template
 */

import { WeeklyExpenseAnalytics, CategoryBreakdown, VendorBreakdown } from '../../analytics/weeklyExpenseAnalytics';

/**
 * Format currency in INR
 */
function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Format date for display
 */
function formatDateDisplay(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
  });
}

/**
 * Get category emoji
 */
function getCategoryEmoji(category: string): string {
  const emojis: Record<string, string> = {
    food: '🍔',
    groceries: '🛒',
    entertainment: '🎬',
    shopping: '🛍️',
    travel: '🚗',
    health: '💊',
    personal: '👤',
    other: '📦',
  };
  return emojis[category] || '📦';
}

/**
 * Get trend arrow and color
 */
function getTrendInfo(trend: 'up' | 'down' | 'same'): { arrow: string; color: string; text: string } {
  switch (trend) {
    case 'up':
      return { arrow: '↑', color: '#e53935', text: 'more than' };
    case 'down':
      return { arrow: '↓', color: '#43a047', text: 'less than' };
    default:
      return { arrow: '→', color: '#757575', text: 'same as' };
  }
}

/**
 * Get category color
 */
function getCategoryColor(category: string): string {
  const colors: Record<string, string> = {
    food: '#FF6384',
    groceries: '#36A2EB',
    entertainment: '#FFCE56',
    shopping: '#4BC0C0',
    travel: '#9966FF',
    health: '#FF9F40',
    personal: '#C9CBCF',
    other: '#7C8798',
  };
  return colors[category] || '#7C8798';
}

/**
 * Vendor colors for pie chart
 */
const VENDOR_COLORS = ['#2196F3', '#4CAF50', '#FF9800', '#E91E63', '#9C27B0'];

/**
 * Generate SVG pie chart
 */
function generatePieChartSVG(
  data: Array<{ label: string; value: number; color: string }>,
  size: number = 180,
  innerRadius: number = 50
): string {
  const total = data.reduce((sum, d) => sum + d.value, 0);
  if (total === 0) return '';

  const outerRadius = size / 2 - 10;
  const centerX = size / 2;
  const centerY = size / 2;

  let currentAngle = -90; // Start from top
  const paths: string[] = [];

  data.forEach((item) => {
    const percentage = item.value / total;
    const angle = percentage * 360;

    // Calculate start and end angles in radians
    const startAngle = (currentAngle * Math.PI) / 180;
    const endAngle = ((currentAngle + angle) * Math.PI) / 180;

    // Calculate arc points for outer radius
    const x1Outer = centerX + outerRadius * Math.cos(startAngle);
    const y1Outer = centerY + outerRadius * Math.sin(startAngle);
    const x2Outer = centerX + outerRadius * Math.cos(endAngle);
    const y2Outer = centerY + outerRadius * Math.sin(endAngle);

    // Calculate arc points for inner radius
    const x1Inner = centerX + innerRadius * Math.cos(endAngle);
    const y1Inner = centerY + innerRadius * Math.sin(endAngle);
    const x2Inner = centerX + innerRadius * Math.cos(startAngle);
    const y2Inner = centerY + innerRadius * Math.sin(startAngle);

    // Determine if arc should be large (> 180 degrees)
    const largeArcFlag = angle > 180 ? 1 : 0;

    // Create donut segment path
    const pathData = [
      `M ${x1Outer} ${y1Outer}`,
      `A ${outerRadius} ${outerRadius} 0 ${largeArcFlag} 1 ${x2Outer} ${y2Outer}`,
      `L ${x1Inner} ${y1Inner}`,
      `A ${innerRadius} ${innerRadius} 0 ${largeArcFlag} 0 ${x2Inner} ${y2Inner}`,
      'Z',
    ].join(' ');

    paths.push(`<path d="${pathData}" fill="${item.color}" />`);
    currentAngle += angle;
  });

  return `
    <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
      ${paths.join('\n      ')}
    </svg>
  `;
}

/**
 * Generate legend HTML
 */
function generateLegendHTML(
  data: Array<{ label: string; value: number; color: string; percentage: number }>
): string {
  return data
    .map(
      (item) => `
      <tr>
        <td style="padding: 4px 8px 4px 0; vertical-align: middle;">
          <span style="display: inline-block; width: 12px; height: 12px; background-color: ${item.color}; border-radius: 2px;"></span>
        </td>
        <td style="padding: 4px 0; color: #333; font-size: 13px; text-transform: capitalize;">
          ${item.label}
        </td>
        <td style="padding: 4px 0 4px 12px; text-align: right; color: #666; font-size: 13px;">
          ${item.percentage.toFixed(0)}%
        </td>
      </tr>
    `
    )
    .join('');
}

/**
 * Generate the weekly expense summary email HTML
 */
export function generateWeeklyExpenseEmailHTML(
  analytics: WeeklyExpenseAnalytics,
  userName: string
): string {
  const trendInfo = getTrendInfo(analytics.weekComparison.trend);
  const weekRange = `${formatDateDisplay(analytics.weekStart)} - ${formatDateDisplay(analytics.weekEnd)}`;

  // Prepare category data for pie chart
  const categoryChartData = analytics.categoryBreakdown.slice(0, 6).map((cat: CategoryBreakdown) => ({
    label: cat.category,
    value: cat.total,
    color: getCategoryColor(cat.category),
    percentage: cat.percentage,
  }));

  // Prepare vendor data for pie chart
  const vendorChartData = analytics.topVendors.slice(0, 5).map((v: VendorBreakdown, i: number) => ({
    label: v.vendor || 'Unknown',
    value: v.total,
    color: VENDOR_COLORS[i % VENDOR_COLORS.length],
    percentage: analytics.totalSpent > 0 ? (v.total / analytics.totalSpent) * 100 : 0,
  }));

  // Generate category rows for detailed breakdown
  const categoryRows = analytics.categoryBreakdown
    .slice(0, 6)
    .map((cat: CategoryBreakdown) => `
      <tr>
        <td style="padding: 10px 0; border-bottom: 1px solid #f0f0f0;">
          <span style="font-size: 18px;">${getCategoryEmoji(cat.category)}</span>
          <span style="margin-left: 10px; color: #333; font-size: 14px; text-transform: capitalize;">${cat.category}</span>
        </td>
        <td style="padding: 10px 0; border-bottom: 1px solid #f0f0f0; text-align: right;">
          <strong style="color: #333; font-size: 14px;">${formatCurrency(cat.total)}</strong>
          <div style="font-size: 12px; color: #757575;">${cat.count} transaction${cat.count !== 1 ? 's' : ''}</div>
        </td>
        <td style="padding: 10px 0; border-bottom: 1px solid #f0f0f0; text-align: right; width: 60px;">
          <span style="color: #666; font-size: 13px; font-weight: 500;">${cat.percentage.toFixed(0)}%</span>
        </td>
      </tr>
    `).join('');

  // Generate vendor rows
  const vendorRows = analytics.topVendors.length > 0
    ? analytics.topVendors.map((v, i) => `
        <tr>
          <td style="padding: 8px 0; ${i < analytics.topVendors.length - 1 ? 'border-bottom: 1px solid #f0f0f0;' : ''}">
            <span style="display: inline-block; width: 10px; height: 10px; background-color: ${VENDOR_COLORS[i % VENDOR_COLORS.length]}; border-radius: 2px; margin-right: 10px;"></span>
            <span style="color: #333; font-size: 14px;">${v.vendor}</span>
          </td>
          <td style="padding: 8px 0; text-align: right; ${i < analytics.topVendors.length - 1 ? 'border-bottom: 1px solid #f0f0f0;' : ''}">
            <strong style="color: #333; font-size: 14px;">${formatCurrency(v.total)}</strong>
            <span style="color: #757575; font-size: 12px;"> (${v.count}x)</span>
          </td>
        </tr>
      `).join('')
    : '<tr><td colspan="2" style="padding: 16px 0; color: #757575; text-align: center; font-size: 14px;">No vendor data available</td></tr>';

  // Generate daily breakdown
  const maxDailySpend = Math.max(...analytics.dailyBreakdown.map((d) => d.total), 1);
  const dailyRows = analytics.dailyBreakdown.map((d) => {
    const isHighest = analytics.highestSpendingDay?.date === d.date;
    const barWidth = (d.total / maxDailySpend) * 100;

    return `
      <tr>
        <td style="padding: 6px 0; width: 50px;">
          <span style="color: #666; font-size: 13px; font-weight: 500;">${d.dayName.substring(0, 3)}</span>
        </td>
        <td style="padding: 6px 0;">
          <div style="background-color: #f5f5f5; border-radius: 4px; height: 24px; width: 100%; position: relative;">
            <div style="background-color: ${isHighest ? '#FF6384' : '#36A2EB'}; border-radius: 4px; height: 24px; width: ${Math.max(barWidth, d.total > 0 ? 5 : 0)}%;"></div>
          </div>
        </td>
        <td style="padding: 6px 0; text-align: right; width: 80px;">
          <span style="color: ${d.total > 0 ? '#333' : '#bdbdbd'}; font-size: 13px; font-weight: ${d.total > 0 ? '500' : '400'};">
            ${d.total > 0 ? formatCurrency(d.total) : '-'}
          </span>
        </td>
      </tr>
    `;
  }).join('');

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>Weekly Expense Summary</title>
  <!--[if mso]>
  <noscript>
    <xml>
      <o:OfficeDocumentSettings>
        <o:PixelsPerInch>96</o:PixelsPerInch>
      </o:OfficeDocumentSettings>
    </xml>
  </noscript>
  <![endif]-->
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f0f2f5; -webkit-font-smoothing: antialiased;">

  <!-- Wrapper Table -->
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color: #f0f2f5;">
    <tr>
      <td align="center" style="padding: 40px 20px;">

        <!-- Email Container -->
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="600" style="max-width: 600px; width: 100%;">

          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #1976d2 0%, #1565c0 100%); padding: 32px; border-radius: 16px 16px 0 0;">
              <h1 style="margin: 0; color: #ffffff; font-size: 26px; font-weight: 700;">
                📊 Weekly Expense Summary
              </h1>
              <p style="margin: 10px 0 0; color: rgba(255,255,255,0.9); font-size: 15px; font-weight: 400;">
                ${weekRange}
              </p>
            </td>
          </tr>

          <!-- Main Content -->
          <tr>
            <td style="background-color: #ffffff;">

              <!-- Greeting -->
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
                <tr>
                  <td style="padding: 28px 32px 20px;">
                    <p style="margin: 0; color: #333; font-size: 16px; font-weight: 500;">
                      Hi ${userName} 👋
                    </p>
                    <p style="margin: 8px 0 0; color: #666; font-size: 14px; line-height: 1.5;">
                      Here's your spending breakdown for last week.
                    </p>
                  </td>
                </tr>
              </table>

              <!-- Total Spent Card -->
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
                <tr>
                  <td style="padding: 0 32px 24px;">
                    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color: #f8fafc; border-radius: 12px; border-left: 5px solid #1976d2;">
                      <tr>
                        <td style="padding: 24px;">
                          <div style="font-size: 12px; color: #757575; text-transform: uppercase; letter-spacing: 1px; font-weight: 600;">
                            Total Spent
                          </div>
                          <div style="font-size: 42px; font-weight: 700; color: #1976d2; margin: 8px 0; line-height: 1;">
                            ${formatCurrency(analytics.totalSpent)}
                          </div>
                          <div style="font-size: 14px; color: #666;">
                            ${analytics.transactionCount} transaction${analytics.transactionCount !== 1 ? 's' : ''} • Avg ${formatCurrency(analytics.avgDailySpend)}/day
                          </div>
                          ${analytics.weekComparison.previousWeekTotal > 0 ? `
                          <div style="margin-top: 16px; padding-top: 16px; border-top: 1px solid #e0e0e0;">
                            <span style="color: ${trendInfo.color}; font-weight: 600; font-size: 15px;">
                              ${trendInfo.arrow} ${Math.abs(analytics.weekComparison.percentageChange).toFixed(0)}%
                            </span>
                            <span style="color: #666; font-size: 14px;">
                              ${trendInfo.text} last week (${formatCurrency(analytics.weekComparison.previousWeekTotal)})
                            </span>
                          </div>
                          ` : ''}
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- Pie Charts Section -->
              ${categoryChartData.length > 0 ? `
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
                <tr>
                  <td style="padding: 0 32px 24px;">
                    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color: #f8fafc; border-radius: 12px;">
                      <tr>
                        <td style="padding: 24px;">
                          <!-- Two column layout for charts -->
                          <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
                            <tr>
                              <!-- Category Chart -->
                              <td width="50%" valign="top" style="padding-right: 12px;">
                                <h3 style="margin: 0 0 16px; font-size: 14px; color: #333; font-weight: 600; text-align: center;">
                                  By Category
                                </h3>
                                <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
                                  <tr>
                                    <td align="center">
                                      ${generatePieChartSVG(categoryChartData, 140, 40)}
                                    </td>
                                  </tr>
                                  <tr>
                                    <td style="padding-top: 12px;">
                                      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
                                        ${generateLegendHTML(categoryChartData.slice(0, 4))}
                                      </table>
                                    </td>
                                  </tr>
                                </table>
                              </td>
                              <!-- Vendor Chart -->
                              ${vendorChartData.length > 0 ? `
                              <td width="50%" valign="top" style="padding-left: 12px; border-left: 1px solid #e0e0e0;">
                                <h3 style="margin: 0 0 16px; font-size: 14px; color: #333; font-weight: 600; text-align: center;">
                                  Top Vendors
                                </h3>
                                <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
                                  <tr>
                                    <td align="center">
                                      ${generatePieChartSVG(vendorChartData, 140, 40)}
                                    </td>
                                  </tr>
                                  <tr>
                                    <td style="padding-top: 12px;">
                                      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
                                        ${generateLegendHTML(vendorChartData.slice(0, 4))}
                                      </table>
                                    </td>
                                  </tr>
                                </table>
                              </td>
                              ` : ''}
                            </tr>
                          </table>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
              ` : ''}

              <!-- Category Breakdown -->
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
                <tr>
                  <td style="padding: 0 32px 24px;">
                    <h2 style="margin: 0 0 16px; font-size: 16px; color: #333; font-weight: 600;">
                      Spending Details
                    </h2>
                    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
                      ${categoryRows || '<tr><td style="padding: 16px 0; color: #757575; text-align: center; font-size: 14px;">No expenses this week</td></tr>'}
                    </table>
                  </td>
                </tr>
              </table>

              <!-- Daily Breakdown -->
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
                <tr>
                  <td style="padding: 0 32px 24px;">
                    <h2 style="margin: 0 0 16px; font-size: 16px; color: #333; font-weight: 600;">
                      Daily Breakdown
                    </h2>
                    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
                      ${dailyRows}
                    </table>
                    ${analytics.highestSpendingDay ? `
                    <p style="margin: 16px 0 0; font-size: 13px; color: #666;">
                      📍 Highest: <strong style="color: #333;">${analytics.highestSpendingDay.dayName}</strong> (${formatCurrency(analytics.highestSpendingDay.total)})
                      ${analytics.lowestSpendingDay && analytics.lowestSpendingDay.total > 0 ? `
                      &nbsp;&nbsp;•&nbsp;&nbsp;
                      📉 Lowest: <strong style="color: #333;">${analytics.lowestSpendingDay.dayName}</strong> (${formatCurrency(analytics.lowestSpendingDay.total)})
                      ` : ''}
                    </p>
                    ` : ''}
                  </td>
                </tr>
              </table>

              <!-- Top Vendors List -->
              ${analytics.topVendors.length > 0 ? `
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
                <tr>
                  <td style="padding: 0 32px 28px;">
                    <h2 style="margin: 0 0 16px; font-size: 16px; color: #333; font-weight: 600;">
                      Where You Spent
                    </h2>
                    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
                      ${vendorRows}
                    </table>
                  </td>
                </tr>
              </table>
              ` : ''}

              <!-- Insight Box -->
              ${analytics.topCategory ? `
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
                <tr>
                  <td style="padding: 0 32px 28px;">
                    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color: #fff8e1; border-radius: 10px; border-left: 4px solid #ffc107;">
                      <tr>
                        <td style="padding: 16px 20px;">
                          <div style="font-size: 14px; color: #f57c00; line-height: 1.5;">
                            💡 <strong>Insight:</strong> ${getCategoryEmoji(analytics.topCategory.category)}
                            <span style="text-transform: capitalize;">${analytics.topCategory.category}</span>
                            was your top spending category at <strong>${analytics.topCategory.percentage.toFixed(0)}%</strong> of total expenses.
                          </div>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
              ` : ''}

            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f8fafc; padding: 24px 32px; border-radius: 0 0 16px 16px; border-top: 1px solid #e0e0e0;">
              <p style="margin: 0; font-size: 14px; color: #666; text-align: center; font-weight: 500;">
                Finance Watch
              </p>
              <p style="margin: 6px 0 0; font-size: 12px; color: #999; text-align: center;">
                Your Personal Finance Tracker
              </p>
              <p style="margin: 12px 0 0; font-size: 11px; color: #bbb; text-align: center;">
                You received this email because you enabled weekly summaries in your settings.
              </p>
            </td>
          </tr>

        </table>

      </td>
    </tr>
  </table>

</body>
</html>
  `.trim();
}

/**
 * Generate plain text version of the email
 */
export function generateWeeklyExpenseEmailText(
  analytics: WeeklyExpenseAnalytics,
  userName: string
): string {
  const weekRange = `${formatDateDisplay(analytics.weekStart)} - ${formatDateDisplay(analytics.weekEnd)}`;
  const trendInfo = getTrendInfo(analytics.weekComparison.trend);

  let text = `
WEEKLY EXPENSE SUMMARY
${weekRange}
${'='.repeat(50)}

Hi ${userName},

TOTAL SPENT: ${formatCurrency(analytics.totalSpent)}
${analytics.transactionCount} transactions • Avg ${formatCurrency(analytics.avgDailySpend)}/day
`;

  if (analytics.weekComparison.previousWeekTotal > 0) {
    text += `${trendInfo.arrow} ${Math.abs(analytics.weekComparison.percentageChange).toFixed(0)}% ${trendInfo.text} last week (${formatCurrency(analytics.weekComparison.previousWeekTotal)})\n`;
  }

  text += `\nSPENDING BY CATEGORY\n${'-'.repeat(40)}\n`;
  analytics.categoryBreakdown.forEach((cat) => {
    const catName = cat.category.charAt(0).toUpperCase() + cat.category.slice(1);
    text += `${getCategoryEmoji(cat.category)} ${catName.padEnd(15)} ${formatCurrency(cat.total).padStart(12)} (${cat.percentage.toFixed(0)}%)\n`;
  });

  text += `\nDAILY BREAKDOWN\n${'-'.repeat(40)}\n`;
  analytics.dailyBreakdown.forEach((d) => {
    const marker = analytics.highestSpendingDay?.date === d.date ? '📍' : '  ';
    text += `${marker} ${d.dayName.substring(0, 3).padEnd(5)} ${d.total > 0 ? formatCurrency(d.total).padStart(12) : '       -'}\n`;
  });

  if (analytics.topVendors.length > 0) {
    text += `\nTOP VENDORS\n${'-'.repeat(40)}\n`;
    analytics.topVendors.forEach((v, i) => {
      text += `${i + 1}. ${v.vendor.padEnd(25)} ${formatCurrency(v.total).padStart(12)} (${v.count}x)\n`;
    });
  }

  if (analytics.topCategory) {
    text += `\n💡 INSIGHT\n${'-'.repeat(40)}\n`;
    text += `${analytics.topCategory.category.charAt(0).toUpperCase() + analytics.topCategory.category.slice(1)} was your top category at ${analytics.topCategory.percentage.toFixed(0)}% of spending.\n`;
  }

  text += `\n${'='.repeat(50)}\nFinance Watch • Your Personal Finance Tracker\n`;

  return text.trim();
}
