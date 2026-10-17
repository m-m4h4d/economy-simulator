import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  Home,
  Key,
  TrendingUp,
  ShieldCheck,
  DollarSign,
  Percent,
  Calendar,
  Sliders,
  ChevronDown,
  ChevronRight,
  RotateCcw,
  Download,
  Info,
  Scale,
  Building2,
  Landmark,
  Receipt,
  Sparkles,
  CheckCircle2,
  ArrowUpRight,
  ArrowDownRight,
  HelpCircle,
  Layers
} from 'lucide-react';

// --- PRESET SCENARIOS ---
const PRESET_SCENARIOS = [
  {
    id: 'balanced',
    name: 'Baseline Metro Market',
    badge: 'Balanced',
    description: 'Typical urban/suburban benchmark with moderate appreciation and rent growth.',
    params: {
      propertyPrice: 650000,
      downPaymentPct: 20,
      mortgageRate: 6.25,
      loanTermYears: 30,
      monthlyServiceCharge: 420,
      serviceChargeEscalation: 2.5,
      propertyTaxRate: 1.15,
      marginalTaxBracket: 28,
      deductPropertyTax: true,
      deductMortgageInterest: true,
      homeAppreciationRate: 3.8,
      monthlyRent: 2950,
      rentEscalationRate: 3.5,
      opportunityReturnRate: 7.0,
      includeTransactionCosts: false,
      buyingClosingCostPct: 2.0,
      sellingCostPct: 5.0
    }
  },
  {
    id: 'high_rate_condo',
    name: 'High-Service Luxury Condo',
    badge: 'Rent Favored',
    description: 'High HOA/service charges and elevated interest rates vs. strong equity market returns.',
    params: {
      propertyPrice: 850000,
      downPaymentPct: 20,
      mortgageRate: 6.85,
      loanTermYears: 30,
      monthlyServiceCharge: 950,
      serviceChargeEscalation: 3.0,
      propertyTaxRate: 1.25,
      marginalTaxBracket: 32,
      deductPropertyTax: true,
      deductMortgageInterest: true,
      homeAppreciationRate: 3.0,
      monthlyRent: 3400,
      rentEscalationRate: 3.0,
      opportunityReturnRate: 8.5,
      includeTransactionCosts: false,
      buyingClosingCostPct: 2.0,
      sellingCostPct: 5.0
    }
  },
  {
    id: 'growth_hub',
    name: 'High-Growth Tech Hub',
    badge: 'Buy Favored',
    description: 'Rapid home appreciation and steep annual rent escalation reward early buyers.',
    params: {
      propertyPrice: 750000,
      downPaymentPct: 25,
      mortgageRate: 5.75,
      loanTermYears: 30,
      monthlyServiceCharge: 310,
      serviceChargeEscalation: 2.0,
      propertyTaxRate: 1.05,
      marginalTaxBracket: 35,
      deductPropertyTax: true,
      deductMortgageInterest: true,
      homeAppreciationRate: 5.2,
      monthlyRent: 3650,
      rentEscalationRate: 4.8,
      opportunityReturnRate: 6.5,
      includeTransactionCosts: false,
      buyingClosingCostPct: 2.0,
      sellingCostPct: 5.0
    }
  }
];

const DEFAULT_PARAMS = PRESET_SCENARIOS[0].params;

// --- FORMATTING UTILITIES ---
const formatCurrency = (val, compact = false) => {
  if (val === null || val === undefined || isNaN(val)) return '$0';
  const absVal = Math.abs(val);
  const sign = val < 0 ? '-' : '';
  if (compact) {
    if (absVal >= 1_000_000) {
      return `${sign}$${(absVal / 1_000_000).toFixed(2)}M`;
    }
    if (absVal >= 1_000) {
      return `${sign}$${(absVal / 1_000).toFixed(0)}k`;
    }
  }
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0
  }).format(val);
};

const formatPercent = (val, decimals = 2) => `${Number(val).toFixed(decimals)}%`;

// --- CORE 10-YEAR (120-MONTH) FINANCIAL SIMULATION ENGINE ---
function runSimulation(params) {
  const {
    propertyPrice,
    downPaymentPct,
    mortgageRate,
    loanTermYears,
    monthlyServiceCharge,
    serviceChargeEscalation,
    propertyTaxRate,
    marginalTaxBracket,
    deductPropertyTax,
    deductMortgageInterest,
    homeAppreciationRate,
    monthlyRent,
    rentEscalationRate,
    opportunityReturnRate,
    includeTransactionCosts,
    buyingClosingCostPct,
    sellingCostPct
  } = params;

  const downPayment = propertyPrice * (downPaymentPct / 100);
  const loanAmount = Math.max(0, propertyPrice - downPayment);
  const totalMonths = loanTermYears * 12;
  const monthlyMortgageRate = mortgageRate / 100 / 12;

  // Fixed Monthly Mortgage Payment (Principal + Interest)
  let monthlyPI = 0;
  if (loanAmount > 0) {
    if (monthlyMortgageRate > 0) {
      const factor = Math.pow(1 + monthlyMortgageRate, totalMonths);
      monthlyPI = loanAmount * ((monthlyMortgageRate * factor) / (factor - 1));
    } else {
      monthlyPI = loanAmount / totalMonths;
    }
  }

  // Monthly compounding rates for appreciation and opportunity investment return
  const monthlyHomeGrowth = Math.pow(1 + homeAppreciationRate / 100, 1 / 12) - 1;
  const monthlyOppReturn = Math.pow(1 + opportunityReturnRate / 100, 1 / 12) - 1;

  const buyingClosingCosts = includeTransactionCosts
    ? propertyPrice * (buyingClosingCostPct / 100)
    : 0;

  // State trackers across 120 months
  let currentPropertyValue = propertyPrice;
  let remainingLoanBalance = loanAmount;

  // Renter's alternative investment portfolio starts with the upfront capital the Buyer spent (Down Payment + Closing Costs)
  // Each month, any net cash flow difference (Buyer Net Outflow - Renter Outflow) is added to (or withdrawn from) this portfolio
  let renterOpportunityPortfolio = downPayment + buyingClosingCosts;

  // Track pure opportunity cost (investment gains earned on down payment + cash flow differences)
  let cumulativeOpportunityGain = 0;
  let cumulativeBuyerSunkCost = buyingClosingCosts;
  let cumulativeRenterSunkCost = 0;

  let cumulativeTaxSavings = 0;
  let cumulativePrincipalPaid = 0;
  let cumulativeInterestPaid = 0;
  let cumulativeServiceCharges = 0;
  let cumulativePropertyTaxes = 0;
  let cumulativeRentPaid = 0;

  let breakEvenMonth = null;
  let previousNetAdvantage =
    propertyPrice -
    loanAmount -
    (includeTransactionCosts ? propertyPrice * (sellingCostPct / 100) : 0) -
    renterOpportunityPortfolio;

  const yearlyData = [];
  const monthlyData = [];

  // Add Year 0 baseline for chart smoothing
  const year0SellingCost = includeTransactionCosts
    ? propertyPrice * (sellingCostPct / 100)
    : 0;
  const year0BuyerEquity = downPayment - year0SellingCost;
  const year0RenterWealth = downPayment + buyingClosingCosts;

  for (let year = 1; year <= 10; year++) {
    let yearPrincipal = 0;
    let yearInterest = 0;
    let yearServiceCharge = 0;
    let yearPropertyTax = 0;
    let yearTaxSavings = 0;
    let yearRent = 0;
    let yearBuyCashOutflow = 0;
    let yearOpportunityCostGain = 0;

    // Annual escalation multipliers (applied at start of each year)
    const currentMonthlyRent =
      monthlyRent * Math.pow(1 + rentEscalationRate / 100, year - 1);
    const currentMonthlyService =
      monthlyServiceCharge * Math.pow(1 + serviceChargeEscalation / 100, year - 1);

    const monthsInThisYear = [];

    for (let m = 1; m <= 12; m++) {
      const globalMonth = (year - 1) * 12 + m;

      // 1. Mortgage Interest & Principal for month
      const interestPayment = remainingLoanBalance * monthlyMortgageRate;
      let principalPayment = 0;
      if (remainingLoanBalance > 0) {
        principalPayment = Math.min(
          remainingLoanBalance,
          Math.max(0, monthlyPI - interestPayment)
        );
      }
      const actualMortgagePayment = interestPayment + principalPayment;
      remainingLoanBalance = Math.max(0, remainingLoanBalance - principalPayment);

      // 2. Property Tax (based on current property value)
      const monthlyPropTax = (currentPropertyValue * (propertyTaxRate / 100)) / 12;

      // 3. Tax Deduction Shield (Mortgage Interest + Property Tax at Marginal Tax Bracket)
      const deductibleBase =
        (deductMortgageInterest ? interestPayment : 0) +
        (deductPropertyTax ? monthlyPropTax : 0);
      const monthlyTaxShield = deductibleBase * (marginalTaxBracket / 100);

      // 4. Property Value appreciates over the month
      const prevPropertyValue = currentPropertyValue;
      currentPropertyValue = currentPropertyValue * (1 + monthlyHomeGrowth);
      const monthlyAppreciation = currentPropertyValue - prevPropertyValue;

      // 5. Net Monthly Cash Outflows
      const netBuyerMonthlyOutflow =
        actualMortgagePayment +
        currentMonthlyService +
        monthlyPropTax -
        monthlyTaxShield;
      const netRenterMonthlyOutflow = currentMonthlyRent;

      // 6. Opportunity Cost & Renter Portfolio Compounding
      // Existing portfolio compounds for the month, plus the monthly cash flow differential saved by renting
      const monthlyPortfolioReturn = renterOpportunityPortfolio * monthlyOppReturn;
      const monthlyCashFlowDiff = netBuyerMonthlyOutflow - netRenterMonthlyOutflow;
      renterOpportunityPortfolio =
        renterOpportunityPortfolio + monthlyPortfolioReturn + monthlyCashFlowDiff;

      cumulativeOpportunityGain += monthlyPortfolioReturn;
      yearOpportunityCostGain += monthlyPortfolioReturn;

      // 7. Sunk Costs Tracking
      const buyerMonthlySunk =
        interestPayment +
        currentMonthlyService +
        monthlyPropTax -
        monthlyTaxShield;
      cumulativeBuyerSunkCost += buyerMonthlySunk;
      cumulativeRenterSunkCost += netRenterMonthlyOutflow;

      // 8. Equity & Net Advantage Calculation at Month End
      const liquidationSellingCost = includeTransactionCosts
        ? currentPropertyValue * (sellingCostPct / 100)
        : 0;
      const grossEquity = currentPropertyValue - remainingLoanBalance;
      const netLiquidationEquity = grossEquity - liquidationSellingCost;

      // Net Advantage of Buying over Renting at Month `globalMonth`
      const netBuyAdvantage = netLiquidationEquity - renterOpportunityPortfolio;

      // Cumulative Net Economic Cost of Buying vs Renting
      // Buyer Net Economic Cost = Sunk Costs + Opportunity Gain Foregone + Liquidation Cost - Home Appreciation
      const totalAppreciationToDate = currentPropertyValue - propertyPrice;
      const buyerNetEconomicCost =
        cumulativeBuyerSunkCost +
        cumulativeOpportunityGain +
        liquidationSellingCost -
        totalAppreciationToDate;
      const renterNetEconomicCost = cumulativeRenterSunkCost;

      // Detect Break-Even Crossover (when Buying Net Advantage crosses >= 0)
      if (breakEvenMonth === null && netBuyAdvantage >= 0) {
        // Interpolate fractional month if desired, or store exact month index
        const fraction =
          previousNetAdvantage < 0
            ? Math.abs(previousNetAdvantage) /
              (Math.abs(previousNetAdvantage) + netBuyAdvantage)
            : 0;
        breakEvenMonth = {
          globalMonth,
          year: Math.ceil(globalMonth / 12),
          monthInYear: ((globalMonth - 1) % 12) + 1,
          exactYearFloat: (globalMonth - 1 + fraction) / 12
        };
      } else if (breakEvenMonth !== null && netBuyAdvantage < 0) {
        // If parameters cause it to dip back below, reset so we find sustained break-even
        breakEvenMonth = null;
      }
      previousNetAdvantage = netBuyAdvantage;

      // Accumulate Yearly & Global Totals
      yearPrincipal += principalPayment;
      yearInterest += interestPayment;
      yearServiceCharge += currentMonthlyService;
      yearPropertyTax += monthlyPropTax;
      yearTaxSavings += monthlyTaxShield;
      yearRent += netRenterMonthlyOutflow;
      yearBuyCashOutflow += netBuyerMonthlyOutflow;

      cumulativePrincipalPaid += principalPayment;
      cumulativeInterestPaid += interestPayment;
      cumulativeServiceCharges += currentMonthlyService;
      cumulativePropertyTaxes += monthlyPropTax;
      cumulativeTaxSavings += monthlyTaxShield;
      cumulativeRentPaid += netRenterMonthlyOutflow;

      const monthRecord = {
        globalMonth,
        year,
        month: m,
        propertyValue: currentPropertyValue,
        remainingLoanBalance,
        grossEquity,
        netLiquidationEquity,
        principalPayment,
        interestPayment,
        serviceCharge: currentMonthlyService,
        propertyTax: monthlyPropTax,
        taxSavings: monthlyTaxShield,
        rentPayment: netRenterMonthlyOutflow,
        netBuyerOutflow: netBuyerMonthlyOutflow,
        renterPortfolio: renterOpportunityPortfolio,
        netBuyAdvantage
      };

      monthsInThisYear.push(monthRecord);
      monthlyData.push(monthRecord);
    }

    const endOfYearMonth = monthsInThisYear[11];
    const liquidationSellingCost = includeTransactionCosts
      ? endOfYearMonth.propertyValue * (sellingCostPct / 100)
      : 0;
    const totalAppreciationToDate = endOfYearMonth.propertyValue - propertyPrice;

    const buyerCumulativeNetCost =
      cumulativeBuyerSunkCost +
      cumulativeOpportunityGain +
      liquidationSellingCost -
      totalAppreciationToDate;
    const renterCumulativeNetCost = cumulativeRenterSunkCost;

    yearlyData.push({
      year,
      propertyValue: endOfYearMonth.propertyValue,
      remainingLoanBalance: endOfYearMonth.remainingLoanBalance,
      grossEquity: endOfYearMonth.grossEquity,
      netLiquidationEquity: endOfYearMonth.netLiquidationEquity,
      annualMortgagePI: yearPrincipal + yearInterest,
      annualPrincipal: yearPrincipal,
      annualInterest: yearInterest,
      annualServiceCharge: yearServiceCharge,
      annualPropertyTax: yearPropertyTax,
      annualServiceAndTax: yearServiceCharge + yearPropertyTax,
      annualTaxSavings: yearTaxSavings,
      annualNetBuyOutflow: yearBuyCashOutflow,
      annualRentOutflow: yearRent,
      annualCashDiff: yearBuyCashOutflow - yearRent,
      annualOpportunityGain: yearOpportunityCostGain,
      cumulativeOpportunityGain,
      renterPortfolio: endOfYearMonth.renterPortfolio,
      buyerCumulativeNetCost,
      renterCumulativeNetCost,
      netBuyAdvantage: endOfYearMonth.netBuyAdvantage,
      cumulativeTaxSavings,
      cumulativePrincipalPaid,
      totalAppreciationToDate,
      months: monthsInThisYear
    });
  }

  const finalYear = yearlyData[yearlyData.length - 1];

  return {
    upfront: {
      downPayment,
      loanAmount,
      buyingClosingCosts,
      monthlyPI,
      initialMonthlyService: monthlyServiceCharge,
      initialMonthlyPropTax: (propertyPrice * (propertyTaxRate / 100)) / 12,
      initialMonthlyTaxShield:
        ((deductMortgageInterest ? loanAmount * monthlyMortgageRate : 0) +
          (deductPropertyTax ? (propertyPrice * (propertyTaxRate / 100)) / 12 : 0)) *
        (marginalTaxBracket / 100),
      year0BuyerEquity,
      year0RenterWealth
    },
    summary: {
      tenYearNetAdvantage: finalYear.netBuyAdvantage,
      isBuyingBetter: finalYear.netBuyAdvantage >= 0,
      breakEven: breakEvenMonth,
      totalEquityBuilt: finalYear.grossEquity,
      netLiquidationEquity: finalYear.netLiquidationEquity,
      downPaymentInitial: downPayment,
      principalPaid10Yr: cumulativePrincipalPaid,
      appreciationGain10Yr: finalYear.propertyValue - propertyPrice,
      totalTaxSavings10Yr: cumulativeTaxSavings,
      totalInterestPaid10Yr: cumulativeInterestPaid,
      totalServiceCharges10Yr: cumulativeServiceCharges,
      totalPropertyTax10Yr: cumulativePropertyTaxes,
      totalRentPaid10Yr: cumulativeRentPaid,
      finalPropertyValue: finalYear.propertyValue,
      finalLoanBalance: finalYear.remainingLoanBalance,
      finalRenterPortfolio: finalYear.renterPortfolio
    },
    yearlyData,
    monthlyData
  };
}

// --- REUSABLE CONTROL SLIDER COMPONENT ---
function ParameterSlider({
  label,
  value,
  onChange,
  min,
  max,
  step = 1,
  formatDisplay,
  secondaryBadge,
  tooltip
}) {
  const percentage = Math.min(100, Math.max(0, ((value - min) / (max - min)) * 100));

  return (
    <div className="py-2.5">
      <div className="flex items-center justify-between gap-2 mb-1.5">
        <div className="flex items-center gap-1.5">
          <label className="text-xs font-medium text-stone-700 tracking-tight">
            {label}
          </label>
          {tooltip && (
            <span className="group relative cursor-help text-stone-400 hover:text-stone-600">
              <Info className="w-3.5 h-3.5" />
              <span className="pointer-events-none absolute left-0 bottom-full mb-1.5 w-56 rounded-lg bg-stone-900 px-2.5 py-2 text-[11px] leading-relaxed text-stone-100 opacity-0 shadow-xl transition-opacity group-hover:opacity-100 z-50">
                {tooltip}
              </span>
            </span>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          {secondaryBadge && (
            <span className="text-[11px] font-mono text-stone-500 bg-stone-100 px-1.5 py-0.5 rounded border border-stone-200/70">
              {secondaryBadge}
            </span>
          )}
          <span className="text-xs font-mono font-semibold text-stone-900 bg-stone-100/90 border border-stone-200 px-2 py-0.5 rounded-md tabular-nums">
            {formatDisplay ? formatDisplay(value) : value}
          </span>
        </div>
      </div>

      <div className="relative flex items-center">
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange( parseFloat(e.target.value) )}
          className="w-full h-1.5 bg-stone-200 rounded-lg appearance-none cursor-pointer accent-teal-700 focus:outline-none"
          style={{
            background: `linear-gradient(to right, #0F766E 0%, #0F766E ${percentage}%, #E5E4DF ${percentage}%, #E5E4DF 100%)`
          }}
        />
      </div>
    </div>
  );
}

// --- INTERACTIVE 10-YEAR SVG CHART ---
function TenYearComparisonChart({ simulation, chartMode, setChartMode }) {
  const [hoverIndex, setHoverIndex] = useState(null);
  const svgRef = useRef(null);

  const { yearlyData, summary, upfront } = simulation;

  // Build 11 points (Year 0 to Year 10) for smooth trajectories
  const dataPoints = useMemo(() => {
    const pts = [
      {
        year: 0,
        buyWealth: upfront.year0BuyerEquity,
        rentWealth: upfront.year0RenterWealth,
        buyCost: 0,
        rentCost: 0,
        netAdvantage: upfront.year0BuyerEquity - upfront.year0RenterWealth,
        propertyValue: upfront.downPayment + upfront.loanAmount,
        annualBuyOutflow:
          (upfront.monthlyPI +
            upfront.initialMonthlyService +
            upfront.initialMonthlyPropTax -
            upfront.initialMonthlyTaxShield) *
          12,
        annualRentOutflow: yearlyData[0]?.annualRentOutflow || 0
      }
    ];

    yearlyData.forEach((yr) => {
      pts.push({
        year: yr.year,
        buyWealth: yr.netLiquidationEquity,
        rentWealth: yr.renterPortfolio,
        buyCost: yr.buyerCumulativeNetCost,
        rentCost: yr.renterCumulativeNetCost,
        netAdvantage: yr.netBuyAdvantage,
        propertyValue: yr.propertyValue,
        annualBuyOutflow: yr.annualNetBuyOutflow,
        annualRentOutflow: yr.annualRentOutflow
      });
    });
    return pts;
  }, [yearlyData, upfront]);

  // Select series based on chartMode
  const seriesConfig = useMemo(() => {
    if (chartMode === 'wealth') {
      return {
        title: 'Net Wealth Position (Home Equity vs. Renter Investment Portfolio)',
        subtitle:
          'Higher trajectory indicates greater accumulated net worth at the end of each year.',
        buyKey: 'buyWealth',
        rentKey: 'rentWealth',
        buyLabel: 'Buyer Net Home Equity',
        rentLabel: 'Renter Investment Portfolio',
        betterDirection: 'Higher is Better'
      };
    } else if (chartMode === 'cost') {
      return {
        title: 'Cumulative Net Economic Cost (Sunk Costs + Opportunity Cost - Appreciation)',
        subtitle:
          'Lower trajectory indicates the more economical housing path after accounting for equity gains.',
        buyKey: 'buyCost',
        rentKey: 'rentCost',
        buyLabel: 'Buying Net Cumulative Cost',
        rentLabel: 'Renting Cumulative Cost',
        betterDirection: 'Lower is Cheaper'
      };
    } else {
      return {
        title: 'Annual Net Cash Outflow (After-Tax Mortgage + Service vs. Annual Rent)',
        subtitle:
          'Compares yearly out-of-pocket cash required for ownership vs. escalating annual rent.',
        buyKey: 'annualBuyOutflow',
        rentKey: 'annualRentOutflow',
        buyLabel: 'Buyer Net Annual Cash Outflow',
        rentLabel: 'Renter Annual Rent Outflow',
        betterDirection: 'Annual Cash Flow'
      };
    }
  }, [chartMode]);

  // Compute SVG coordinate scales
  const width = 820;
  const height = 340;
  const padLeft = 72;
  const padRight = 32;
  const padTop = 28;
  const padBottom = 42;
  const plotW = width - padLeft - padRight;
  const plotH = height - padTop - padBottom;

  const allValues = dataPoints.flatMap((d) => [
    d[seriesConfig.buyKey],
    d[seriesConfig.rentKey]
  ]);
  const rawMin = Math.min(0, ...allValues);
  const rawMax = Math.max(10000, ...allValues);
  const ySpan = rawMax - rawMin || 1;
  const yMin = rawMin < 0 ? rawMin * 1.1 : 0;
  const yMax = rawMax + ySpan * 0.12;

  const getX = (year) => padLeft + (year / 10) * plotW;
  const getY = (val) =>
    padTop + plotH - ((val - yMin) / (yMax - yMin || 1)) * plotH;

  // Build SVG path strings
  const buyPath = dataPoints
    .map((d, i) => `${i === 0 ? 'M' : 'L'} ${getX(d.year).toFixed(1)} ${getY(d[seriesConfig.buyKey]).toFixed(1)}`)
    .join(' ');

  const rentPath = dataPoints
    .map((d, i) => `${i === 0 ? 'M' : 'L'} ${getX(d.year).toFixed(1)} ${getY(d[seriesConfig.rentKey]).toFixed(1)}`)
    .join(' ');

  // Area fill under Buyer trajectory
  const buyAreaPath = `${buyPath} L ${getX(10).toFixed(1)} ${getY(0).toFixed(1)} L ${getX(0).toFixed(1)} ${getY(0).toFixed(1)} Z`;

  // Y-axis ticks (5 ticks)
  const yTicks = Array.from({ length: 5 }, (_, i) => {
    const val = yMin + ((yMax - yMin) / 4) * i;
    return { val, y: getY(val) };
  });

  // Compute Break-Even X/Y coordinate for wealth/cost modes
  const breakEvenPoint = useMemo(() => {
    if (!summary.breakEven || chartMode === 'cashflow') return null;
    const exactYr = summary.breakEven.exactYearFloat;
    if (exactYr < 0 || exactYr > 10) return null;

    const lowerYr = Math.floor(exactYr);
    const upperYr = Math.min(10, Math.ceil(exactYr));
    const frac = exactYr - lowerYr;

    const p0 = dataPoints[lowerYr];
    const p1 = dataPoints[upperYr];
    if (!p0 || !p1) return null;

    const interpVal =
      p0[seriesConfig.buyKey] +
      frac * (p1[seriesConfig.buyKey] - p0[seriesConfig.buyKey]);

    return {
      x: getX(exactYr),
      y: getY(interpVal),
      exactYr,
      val: interpVal
    };
  }, [summary.breakEven, chartMode, dataPoints, seriesConfig]);

  const handleMouseMove = (e) => {
    if (!svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const relX = ((e.clientX - rect.left) / rect.width) * width;
    const clampedX = Math.max(padLeft, Math.min(width - padRight, relX));
    const nearestYear = Math.round(((clampedX - padLeft) / plotW) * 10);
    setHoverIndex(Math.max(0, Math.min(10, nearestYear)));
  };

  const activePoint = hoverIndex !== null ? dataPoints[hoverIndex] : dataPoints[10];

  return (
    <div className="bg-white rounded-2xl border border-stone-200/90 shadow-sm p-5 sm:p-6">
      {/* Header & Mode Switcher */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-5 border-b border-stone-100">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-mono font-semibold uppercase tracking-wider bg-stone-100 text-stone-700">
              10-Year Trajectory
            </span>
            <span className="text-xs font-mono text-stone-400">
              • {seriesConfig.betterDirection}
            </span>
          </div>
          <h2
            className="text-lg sm:text-xl font-semibold text-stone-900 mt-1"
            style={{ fontFamily: "'Fraunces', Georgia, serif" }}
          >
            {seriesConfig.title}
          </h2>
          <p className="text-xs text-stone-500 mt-0.5">{seriesConfig.subtitle}</p>
        </div>

        {/* Mode Segmented Control */}
        <div className="inline-flex bg-stone-100 p-1 rounded-xl border border-stone-200/80 self-start">
          {[
            { id: 'wealth', label: 'Net Wealth' },
            { id: 'cost', label: 'Cumulative Net Cost' },
            { id: 'cashflow', label: 'Annual Outflow' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setChartMode(tab.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                chartMode === tab.id
                  ? 'bg-white text-stone-900 shadow-sm border border-stone-200/60'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Live Legend & Inspected Year Ribbon */}
      <div className="flex flex-wrap items-center justify-between gap-4 py-3.5 px-4 my-4 rounded-xl bg-stone-50/90 border border-stone-200/70">
        <div className="flex flex-wrap items-center gap-5">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-teal-700 inline-block ring-4 ring-teal-700/15" />
            <div>
              <div className="text-[11px] text-stone-500 font-medium">
                {seriesConfig.buyLabel}
              </div>
              <div className="text-sm font-mono font-bold text-stone-900 tabular-nums">
                {formatCurrency(activePoint[seriesConfig.buyKey])}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-orange-700 inline-block ring-4 ring-orange-700/15" />
            <div>
              <div className="text-[11px] text-stone-500 font-medium">
                {seriesConfig.rentLabel}
              </div>
              <div className="text-sm font-mono font-bold text-stone-900 tabular-nums">
                {formatCurrency(activePoint[seriesConfig.rentKey])}
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 border-t sm:border-t-0 pt-2 sm:pt-0 border-stone-200 w-full sm:w-auto justify-between sm:justify-end">
          <span className="text-xs font-mono uppercase tracking-wider text-stone-500 bg-white px-2.5 py-1 rounded-md border border-stone-200">
            {hoverIndex !== null ? `Inspecting Year ${activePoint.year}` : 'Year 10 Horizon'}
          </span>
          <div
            className={`px-2.5 py-1 rounded-md text-xs font-mono font-semibold border ${
              activePoint.netAdvantage >= 0
                ? 'bg-teal-50 text-teal-800 border-teal-200'
                : 'bg-orange-50 text-orange-800 border-orange-200'
            }`}
          >
            {activePoint.netAdvantage >= 0 ? 'Buy Advantage: +' : 'Rent Advantage: +'}
            {formatCurrency(Math.abs(activePoint.netAdvantage))}
          </div>
        </div>
      </div>

      {/* Responsive Interactive SVG Canvas */}
      <div className="relative select-none">
        <svg
          ref={svgRef}
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-auto overflow-visible cursor-crosshair"
          onMouseMove={handleMouseMove}
          onMouseLeave={() => setHoverIndex(null)}
          onTouchMove={(e) => {
            if (e.touches[0]) {
              handleMouseMove(e.touches[0]);
            }
          }}
        >
          <defs>
            <linearGradient id="buyAreaGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#0F766E" stopOpacity="0.18" />
              <stop offset="100%" stopColor="#0F766E" stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Horizontal Grid Lines & Y-Axis Labels */}
          {yTicks.map((t, idx) => (
            <g key={idx}>
              <line
                x1={padLeft}
                y1={t.y}
                x2={width - padRight}
                y2={t.y}
                stroke={Math.abs(t.val) < 1 ? '#A8A29E' : '#E7E5E4'}
                strokeDasharray={Math.abs(t.val) < 1 ? 'none' : '4 4'}
                strokeWidth="1"
              />
              <text
                x={padLeft - 10}
                y={t.y + 4}
                textAnchor="end"
                className="fill-stone-400 font-mono text-[11px]"
              >
                {formatCurrency(t.val, true)}
              </text>
            </g>
          ))}

          {/* X-Axis Year Grid & Ticks */}
          {dataPoints.map((pt) => {
            const x = getX(pt.year);
            const isHovered = hoverIndex === pt.year;
            return (
              <g key={pt.year}>
                <line
                  x1={x}
                  y1={padTop}
                  x2={x}
                  y2={height - padBottom}
                  stroke={isHovered ? '#0F766E' : '#F5F5F4'}
                  strokeWidth={isHovered ? '1.5' : '1'}
                />
                <text
                  x={x}
                  y={height - padBottom + 20}
                  textAnchor="middle"
                  className={`font-mono text-[11px] ${
                    isHovered ? 'fill-stone-900 font-bold' : 'fill-stone-500'
                  }`}
                >
                  Yr {pt.year}
                </text>
              </g>
            );
          })}

          {/* Shaded Area under Buy Curve */}
          <path d={buyAreaPath} fill="url(#buyAreaGrad)" />

          {/* Renter Trajectory Line (Warm Terracotta) */}
          <path
            d={rentPath}
            fill="none"
            stroke="#C2410C"
            strokeWidth="2.75"
            strokeDasharray="6 4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Buyer Trajectory Line (Forest Emerald) */}
          <path
            d={buyPath}
            fill="none"
            stroke="#0F766E"
            strokeWidth="3.25"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Break-Even Crossover Callout Pin */}
          {breakEvenPoint && (
            <g>
              <line
                x1={breakEvenPoint.x}
                y1={padTop}
                x2={breakEvenPoint.x}
                y2={height - padBottom}
                stroke="#0F766E"
                strokeWidth="1.5"
                strokeDasharray="3 3"
              />
              <circle
                cx={breakEvenPoint.x}
                cy={breakEvenPoint.y}
                r="7"
                fill="#FFFFFF"
                stroke="#0F766E"
                strokeWidth="3"
              />
              <g
                transform={`translate(${Math.min(
                  width - 165,
                  Math.max(padLeft + 10, breakEvenPoint.x - 62)
                )}, ${Math.max(padTop + 6, breakEvenPoint.y - 38)})`}
              >
                <rect
                  width="124"
                  height="24"
                  rx="6"
                  fill="#111827"
                  opacity="0.94"
                />
                <text
                  x="62"
                  y="15.5"
                  textAnchor="middle"
                  className="fill-white font-mono text-[10px] font-semibold"
                >
                  Break-Even: Yr {breakEvenPoint.exactYr.toFixed(1)}
                </text>
              </g>
            </g>
          )}

          {/* Data Nodes for Each Year */}
          {dataPoints.map((pt) => {
            const cx = getX(pt.year);
            const cyBuy = getY(pt[seriesConfig.buyKey]);
            const cyRent = getY(pt[seriesConfig.rentKey]);
            const isHovered = hoverIndex === pt.year;

            return (
              <g key={pt.year}>
                <circle
                  cx={cx}
                  cy={cyRent}
                  r={isHovered ? 6 : 3.5}
                  fill="#FFFFFF"
                  stroke="#C2410C"
                  strokeWidth={isHovered ? 3 : 2}
                />
                <circle
                  cx={cx}
                  cy={cyBuy}
                  r={isHovered ? 6.5 : 4}
                  fill="#0F766E"
                  stroke="#FFFFFF"
                  strokeWidth={isHovered ? 2.5 : 1.5}
                />
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}

// --- MAIN APPLICATION COMPONENT ---
export default function RentVsBuySimulator() {
  const [params, setParams] = useState(DEFAULT_PARAMS);
  const [activePreset, setActivePreset] = useState('balanced');
  const [openSection, setOpenSection] = useState('all'); // 'property' | 'rent' | 'taxes' | 'all'
  const [chartMode, setChartMode] = useState('wealth');
  const [expandedYears, setExpandedYears] = useState({});
  const [showMethodologyModal, setShowMethodologyModal] = useState(false);

  // Run 120-month simulation whenever parameters change
  const simulation = useMemo(() => runSimulation(params), [params]);
  const { summary, upfront, yearlyData } = simulation;

  const updateParam = (key, value) => {
    setActivePreset('custom');
    setParams((prev) => ({
      ...prev,
      [key]: value
    }));
  };

  const applyPreset = (preset) => {
    setActivePreset(preset.id);
    setParams(preset.params);
  };

  const toggleYearExpand = (year) => {
    setExpandedYears((prev) => ({
      ...prev,
      [year]: !prev[year]
    }));
  };

  // Export CSV helper
  const handleExportCSV = () => {
    const headers = [
      'Year',
      'Property Value',
      'Remaining Loan Balance',
      'Gross Home Equity',
      'Net Liquidation Equity',
      'Annual Mortgage P&I',
      'Annual Principal Paid',
      'Annual Interest Paid',
      'Annual Service Charges',
      'Annual Property Tax',
      'Annual Tax Deduction Savings',
      'Annual Rent Outflow',
      'Renter Opportunity Portfolio',
      'Net Buy vs Rent Advantage'
    ];
    const rows = yearlyData.map((r) => [
      r.year,
      Math.round(r.propertyValue),
      Math.round(r.remainingLoanBalance),
      Math.round(r.grossEquity),
      Math.round(r.netLiquidationEquity),
      Math.round(r.annualMortgagePI),
      Math.round(r.annualPrincipal),
      Math.round(r.annualInterest),
      Math.round(r.annualServiceCharge),
      Math.round(r.annualPropertyTax),
      Math.round(r.annualTaxSavings),
      Math.round(r.annualRentOutflow),
      Math.round(r.renterPortfolio),
      Math.round(r.netBuyAdvantage)
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', '10_year_rent_vs_buy_schedule.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div
      className="min-h-screen bg-[#F8F7F4] text-[#111827] pb-16"
      style={{ fontFamily: "'Inter', system-ui, -apple-system, sans-serif" }}
    >
      {/* Google Fonts Injection for Fraunces & JetBrains Mono */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,600;9..144,700&family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600;700&display=swap');
        .font-serif-display { font-family: 'Fraunces', Georgia, serif; }
        .font-mono-tabular { font-family: 'JetBrains Mono', monospace; font-variant-numeric: tabular-nums; }
      `}</style>

      {/* TOP EDITORIAL HEADER BAR */}
      <header className="sticky top-0 z-30 bg-[#F8F7F4]/95 backdrop-blur-md border-b border-stone-200/90">
        <div className="max-w-[1480px] mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-teal-800 text-white flex items-center justify-center shadow-sm">
              <Scale className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg sm:text-xl font-bold tracking-tight text-stone-900 font-serif-display">
                  Capital & Shelter: 10-Year Rent vs. Buy Simulator
                </h1>
                <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-mono font-medium bg-teal-50 text-teal-800 border border-teal-200">
                  120-Month Engine
                </span>
              </div>
              <p className="text-xs text-stone-500">
                Models amortization, service charges, marginal tax shields, rent escalation & opportunity cost of capital
              </p>
            </div>
          </div>

          {/* Scenario Presets & Utility Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center bg-stone-200/70 p-1 rounded-xl border border-stone-300/60">
              {PRESET_SCENARIOS.map((preset) => (
                <button
                  key={preset.id}
                  onClick={() => applyPreset(preset)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                    activePreset === preset.id
                      ? 'bg-white text-stone-900 shadow-sm font-semibold'
                      : 'text-stone-600 hover:text-stone-900'
                  }`}
                  title={preset.description}
                >
                  {preset.name}
                </button>
              ))}
            </div>

            <button
              onClick={() => setShowMethodologyModal(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium bg-white border border-stone-200 text-stone-700 hover:bg-stone-50 shadow-sm transition"
            >
              <HelpCircle className="w-3.5 h-3.5 text-teal-700" />
              <span>Model Math</span>
            </button>

            <button
              onClick={() => applyPreset(PRESET_SCENARIOS[0])}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-medium bg-white border border-stone-200 text-stone-600 hover:text-stone-900 hover:bg-stone-50 shadow-sm transition"
              title="Reset to Baseline Defaults"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Reset</span>
            </button>
          </div>
        </div>
      </header>

      {/* MAIN WORKSPACE GRID */}
      <main className="max-w-[1480px] mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* LEFT COLUMN: STICKY PARAMETER STUDIO (4 COLS ON DESKTOP) */}
          <aside className="lg:col-span-4 xl:col-span-4 lg:sticky lg:top-20 space-y-4">
            {/* Live Initial Monthly Cash-Flow Snapshot Card */}
            <div className="bg-stone-900 text-stone-100 rounded-2xl p-4 shadow-md border border-stone-800">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[11px] font-mono uppercase tracking-wider text-stone-400">
                  Year 1 Monthly Cash Outflow
                </span>
                <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-stone-800 text-teal-300 border border-stone-700">
                  Upfront Cash: {formatCurrency(upfront.downPayment + upfront.buyingClosingCosts)}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-1 border-t border-stone-800">
                <div>
                  <div className="text-xs text-stone-400 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-teal-400" />
                    Net Buy Outflow / mo
                  </div>
                  <div className="text-lg font-mono font-bold text-white mt-0.5 tabular-nums">
                    {formatCurrency(
                      upfront.monthlyPI +
                        upfront.initialMonthlyService +
                        upfront.initialMonthlyPropTax -
                        upfront.initialMonthlyTaxShield
                    )}
                  </div>
                  <div className="text-[11px] text-stone-400 font-mono mt-0.5">
                    P&I {formatCurrency(upfront.monthlyPI)} + Charges/Tax
                  </div>
                </div>

                <div className="border-l border-stone-800 pl-3">
                  <div className="text-xs text-stone-400 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-orange-400" />
                    Starting Rent / mo
                  </div>
                  <div className="text-lg font-mono font-bold text-white mt-0.5 tabular-nums">
                    {formatCurrency(params.monthlyRent)}
                  </div>
                  <div className="text-[11px] text-stone-400 font-mono mt-0.5">
                    Escalates at {formatPercent(params.rentEscalationRate, 1)}/yr
                  </div>
                </div>
              </div>
            </div>

            {/* Interactive Controls Container */}
            <div className="bg-white rounded-2xl border border-stone-200/90 shadow-sm overflow-hidden">
              <div className="px-4 py-3 bg-stone-50 border-b border-stone-200/80 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-teal-700" />
                  <h2 className="text-xs font-bold uppercase tracking-wider text-stone-800">
                    Simulation Parameters
                  </h2>
                </div>
                <button
                  onClick={() =>
                    setOpenSection(openSection === 'all' ? 'property' : 'all')
                  }
                  className="text-[11px] font-medium text-teal-700 hover:text-teal-800"
                >
                  {openSection === 'all' ? 'Accordion Mode' : 'Expand All'}
                </button>
              </div>

              {/* SECTION 1: PROPERTY & MORTGAGE */}
              <div className="border-b border-stone-200/70">
                <button
                  onClick={() =>
                    setOpenSection(
                      openSection === 'property' ? '' : 'property'
                    )
                  }
                  className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-stone-50/80 transition"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-lg bg-teal-50 text-teal-700 flex items-center justify-center">
                      <Home className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-semibold text-stone-900">
                        1. Property & Mortgage Financing
                      </div>
                      <div className="text-[11px] text-stone-500 font-mono">
                        {formatCurrency(params.propertyPrice, true)} • {params.downPaymentPct}% Down • {params.mortgageRate}%
                      </div>
                    </div>
                  </div>
                  <ChevronDown
                    className={`w-4 h-4 text-stone-400 transition-transform ${
                      openSection === 'property' || openSection === 'all'
                        ? 'rotate-180'
                        : ''
                    }`}
                  />
                </button>

                {(openSection === 'property' || openSection === 'all') && (
                  <div className="px-4 pb-4 pt-1 space-y-1 border-t border-stone-100">
                    <ParameterSlider
                      label="Property Purchase Price"
                      value={params.propertyPrice}
                      min={150000}
                      max={2500000}
                      step={10000}
                      onChange={(v) => updateParam('propertyPrice', v)}
                      formatDisplay={(v) => formatCurrency(v)}
                      tooltip="Initial acquisition price of the home."
                    />

                    <ParameterSlider
                      label="Down Payment %"
                      value={params.downPaymentPct}
                      min={3}
                      max={80}
                      step={1}
                      onChange={(v) => updateParam('downPaymentPct', v)}
                      formatDisplay={(v) => `${v}%`}
                      secondaryBadge={formatCurrency(
                        (params.propertyPrice * params.downPaymentPct) / 100
                      )}
                      tooltip="Percentage of purchase price paid upfront. Directly impacts loan size and opportunity cost."
                    />

                    <ParameterSlider
                      label="Mortgage Interest Rate"
                      value={params.mortgageRate}
                      min={2.0}
                      max={11.0}
                      step={0.05}
                      onChange={(v) => updateParam('mortgageRate', v)}
                      formatDisplay={(v) => formatPercent(v, 2)}
                      secondaryBadge={`${formatCurrency(upfront.monthlyPI)}/mo`}
                      tooltip="Annual fixed nominal interest rate on the mortgage loan."
                    />

                    <ParameterSlider
                      label="Home Appreciation Rate (Annual)"
                      value={params.homeAppreciationRate}
                      min={-2.0}
                      max={10.0}
                      step={0.1}
                      onChange={(v) => updateParam('homeAppreciationRate', v)}
                      formatDisplay={(v) => formatPercent(v, 1)}
                      tooltip="Projected annual compound growth rate of the property's market value."
                    />

                    {/* Loan Term Selector */}
                    <div className="pt-2 flex items-center justify-between">
                      <span className="text-xs font-medium text-stone-700">
                        Amortization Term
                      </span>
                      <div className="inline-flex rounded-lg bg-stone-100 p-0.5 border border-stone-200">
                        {[15, 20, 30].map((term) => (
                          <button
                            key={term}
                            onClick={() => updateParam('loanTermYears', term)}
                            className={`px-2.5 py-1 rounded-md text-xs font-mono transition ${
                              params.loanTermYears === term
                                ? 'bg-white text-stone-900 font-semibold shadow-sm'
                                : 'text-stone-600 hover:text-stone-900'
                            }`}
                          >
                            {term} Yr
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* SECTION 2: SERVICE CHARGES & TAX DEDUCTIONS */}
              <div className="border-b border-stone-200/70">
                <button
                  onClick={() =>
                    setOpenSection(openSection === 'taxes' ? '' : 'taxes')
                  }
                  className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-stone-50/80 transition"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-700 flex items-center justify-center">
                      <ShieldCheck className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-semibold text-stone-900">
                        2. Service Charges & Tax Deductions
                      </div>
                      <div className="text-[11px] text-stone-500 font-mono">
                        {formatCurrency(params.monthlyServiceCharge)}/mo HOA • {params.marginalTaxBracket}% Tax Bracket
                      </div>
                    </div>
                  </div>
                  <ChevronDown
                    className={`w-4 h-4 text-stone-400 transition-transform ${
                      openSection === 'taxes' || openSection === 'all'
                        ? 'rotate-180'
                        : ''
                    }`}
                  />
                </button>

                {(openSection === 'taxes' || openSection === 'all') && (
                  <div className="px-4 pb-4 pt-1 space-y-1 border-t border-stone-100">
                    <ParameterSlider
                      label="Monthly Service Charges / Maintenance"
                      value={params.monthlyServiceCharge}
                      min={0}
                      max={2500}
                      step={25}
                      onChange={(v) => updateParam('monthlyServiceCharge', v)}
                      formatDisplay={(v) => `${formatCurrency(v)}/mo`}
                      tooltip="Monthly HOA fees, building service charges, insurance, and routine maintenance."
                    />

                    <ParameterSlider
                      label="Service Charge Annual Escalation"
                      value={params.serviceChargeEscalation}
                      min={0}
                      max={8.0}
                      step={0.25}
                      onChange={(v) =>
                        updateParam('serviceChargeEscalation', v)
                      }
                      formatDisplay={(v) => formatPercent(v, 2)}
                      tooltip="Annual inflation rate applied to monthly service charges and maintenance."
                    />

                    <ParameterSlider
                      label="Property Tax Rate (Annual % of Value)"
                      value={params.propertyTaxRate}
                      min={0.0}
                      max={3.5}
                      step={0.05}
                      onChange={(v) => updateParam('propertyTaxRate', v)}
                      formatDisplay={(v) => formatPercent(v, 2)}
                      secondaryBadge={`${formatCurrency(
                        upfront.initialMonthlyPropTax
                      )}/mo`}
                      tooltip="Annual property tax assessed as a percentage of current property value."
                    />

                    <ParameterSlider
                      label="Marginal Income Tax Bracket"
                      value={params.marginalTaxBracket}
                      min={0}
                      max={50}
                      step={1}
                      onChange={(v) => updateParam('marginalTaxBracket', v)}
                      formatDisplay={(v) => `${v}%`}
                      tooltip="Your marginal tax rate used to calculate tax savings from deductible mortgage interest and property taxes."
                    />

                    {/* Tax Deduction Checkboxes */}
                    <div className="pt-2 space-y-2">
                      <div className="text-[11px] font-semibold uppercase tracking-wider text-stone-400">
                        Active Tax Shields
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <label className="flex items-center gap-2 p-2 rounded-lg border border-stone-200 bg-stone-50/70 cursor-pointer hover:bg-stone-100/70 transition">
                          <input
                            type="checkbox"
                            checked={params.deductMortgageInterest}
                            onChange={(e) =>
                              updateParam(
                                'deductMortgageInterest',
                                e.target.checked
                              )
                            }
                            className="rounded text-teal-700 focus:ring-teal-600"
                          />
                          <span className="text-xs font-medium text-stone-700">
                            Mortgage Interest
                          </span>
                        </label>

                        <label className="flex items-center gap-2 p-2 rounded-lg border border-stone-200 bg-stone-50/70 cursor-pointer hover:bg-stone-100/70 transition">
                          <input
                            type="checkbox"
                            checked={params.deductPropertyTax}
                            onChange={(e) =>
                              updateParam('deductPropertyTax', e.target.checked)
                            }
                            className="rounded text-teal-700 focus:ring-teal-600"
                          />
                          <span className="text-xs font-medium text-stone-700">
                            Property Tax
                          </span>
                        </label>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* SECTION 3: RENT & OPPORTUNITY COST */}
              <div>
                <button
                  onClick={() =>
                    setOpenSection(openSection === 'rent' ? '' : 'rent')
                  }
                  className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-stone-50/80 transition"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-lg bg-orange-50 text-orange-700 flex items-center justify-center">
                      <Key className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-semibold text-stone-900">
                        3. Rent & Investment Opportunity Cost
                      </div>
                      <div className="text-[11px] text-stone-500 font-mono">
                        {formatCurrency(params.monthlyRent)}/mo • +{params.rentEscalationRate}%/yr • {params.opportunityReturnRate}% Return
                      </div>
                    </div>
                  </div>
                  <ChevronDown
                    className={`w-4 h-4 text-stone-400 transition-transform ${
                      openSection === 'rent' || openSection === 'all'
                        ? 'rotate-180'
                        : ''
                    }`}
                  />
                </button>

                {(openSection === 'rent' || openSection === 'all') && (
                  <div className="px-4 pb-4 pt-1 space-y-1 border-t border-stone-100">
                    <ParameterSlider
                      label="Current Monthly Rent"
                      value={params.monthlyRent}
                      min={800}
                      max={10000}
                      step={50}
                      onChange={(v) => updateParam('monthlyRent', v)}
                      formatDisplay={(v) => `${formatCurrency(v)}/mo`}
                      tooltip="Starting monthly rent for a comparable property in Year 1."
                    />

                    <ParameterSlider
                      label="Annual Rent Escalation Rate"
                      value={params.rentEscalationRate}
                      min={0.0}
                      max={10.0}
                      step={0.25}
                      onChange={(v) => updateParam('rentEscalationRate', v)}
                      formatDisplay={(v) => formatPercent(v, 2)}
                      secondaryBadge={`Yr 10: ${formatCurrency(
                        params.monthlyRent *
                          Math.pow(1 + params.rentEscalationRate / 100, 9)
                      )}/mo`}
                      tooltip="Annual percentage increase applied to monthly rent upon lease renewal."
                    />

                    <ParameterSlider
                      label="Investment Opportunity Cost Return"
                      value={params.opportunityReturnRate}
                      min={0.0}
                      max={14.0}
                      step={0.25}
                      onChange={(v) => updateParam('opportunityReturnRate', v)}
                      formatDisplay={(v) => formatPercent(v, 2)}
                      tooltip="Expected annual return on alternative investments (e.g., S&P 500 index funds) where the Renter invests the down payment and monthly cash-flow savings."
                    />

                    {/* Optional Closing & Selling Transaction Cost Toggle */}
                    <div className="pt-2 border-t border-stone-100 mt-2">
                      <label className="flex items-center justify-between p-2 rounded-lg border border-stone-200 bg-stone-50/70 cursor-pointer hover:bg-stone-100/70 transition">
                        <div>
                          <div className="text-xs font-medium text-stone-800">
                            Include Closing & Selling Friction
                          </div>
                          <div className="text-[11px] text-stone-500">
                            {params.buyingClosingCostPct}% Purchase Closing + {params.sellingCostPct}% Sale Commission
                          </div>
                        </div>
                        <input
                          type="checkbox"
                          checked={params.includeTransactionCosts}
                          onChange={(e) =>
                            updateParam(
                              'includeTransactionCosts',
                              e.target.checked
                            )
                          }
                          className="rounded text-teal-700 focus:ring-teal-600 h-4 w-4"
                        />
                      </label>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </aside>

          {/* RIGHT COLUMN: ANALYTICS STAGE (8 COLS ON DESKTOP) */}
          <section className="lg:col-span-8 xl:col-span-8 space-y-6">
            {/* 4-CARD REAL-TIME KPI SUMMARY BANNER */}
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
              {/* KPI 1: 10-YEAR NET ADVANTAGE */}
              <div
                className={`rounded-2xl p-5 border shadow-sm transition-all ${
                  summary.isBuyingBetter
                    ? 'bg-gradient-to-br from-teal-900 to-teal-800 text-white border-teal-700'
                    : 'bg-gradient-to-br from-orange-900 to-orange-800 text-white border-orange-700'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-mono uppercase tracking-wider text-white/80">
                    10-Year Net Advantage
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase bg-white/15 text-white border border-white/20">
                    {summary.isBuyingBetter ? 'Buying Wins' : 'Renting Wins'}
                  </span>
                </div>

                <div className="mt-2.5 flex items-baseline gap-1.5">
                  <span className="text-2xl sm:text-3xl font-bold font-mono-tabular tracking-tight">
                    +{formatCurrency(Math.abs(summary.tenYearNetAdvantage))}
                  </span>
                </div>

                <p className="text-xs text-white/85 mt-2 leading-relaxed">
                  {summary.isBuyingBetter
                    ? `Buying builds ${formatCurrency(
                        Math.abs(summary.tenYearNetAdvantage)
                      )} more net wealth than renting & investing over 10 years.`
                    : `Renting & investing the difference outperforms buying by ${formatCurrency(
                        Math.abs(summary.tenYearNetAdvantage)
                      )} at Year 10.`}
                </p>
              </div>

              {/* KPI 2: BREAK-EVEN HORIZON */}
              <div className="bg-white rounded-2xl p-5 border border-stone-200/90 shadow-sm flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-mono uppercase tracking-wider text-stone-500">
                      Break-Even Year
                    </span>
                    <Calendar className="w-4 h-4 text-teal-700" />
                  </div>

                  <div className="mt-2.5">
                    {summary.breakEven ? (
                      <div className="flex items-baseline gap-2">
                        <span className="text-2xl sm:text-3xl font-bold font-mono-tabular text-stone-900">
                          Year {summary.breakEven.exactYearFloat.toFixed(1)}
                        </span>
                        <span className="text-xs font-mono text-teal-700 bg-teal-50 px-2 py-0.5 rounded border border-teal-200">
                          Mo {summary.breakEven.globalMonth}
                        </span>
                      </div>
                    ) : (
                      <div className="flex items-baseline gap-2">
                        <span className="text-2xl sm:text-3xl font-bold font-mono-tabular text-orange-700">
                          &gt; 10 Years
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="mt-3 pt-2.5 border-t border-stone-100 flex items-center justify-between text-xs text-stone-500">
                  <span>Crossover Horizon</span>
                  <span className="font-mono font-medium text-stone-700">
                    {summary.breakEven
                      ? `Yr ${summary.breakEven.year}, Mo ${summary.breakEven.monthInYear}`
                      : 'Renting leads all 10 yrs'}
                  </span>
                </div>
              </div>

              {/* KPI 3: TOTAL EQUITY BUILT */}
              <div className="bg-white rounded-2xl p-5 border border-stone-200/90 shadow-sm flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-mono uppercase tracking-wider text-stone-500">
                      Total Equity Built (Yr 10)
                    </span>
                    <TrendingUp className="w-4 h-4 text-teal-700" />
                  </div>

                  <div className="mt-2.5">
                    <span className="text-2xl sm:text-3xl font-bold font-mono-tabular text-stone-900">
                      {formatCurrency(summary.totalEquityBuilt)}
                    </span>
                  </div>
                </div>

                <div className="mt-3 pt-2.5 border-t border-stone-100 space-y-1 text-[11px] font-mono text-stone-500">
                  <div className="flex justify-between">
                    <span>Principal Paid:</span>
                    <span className="text-stone-800 font-semibold">
                      +{formatCurrency(summary.principalPaid10Yr, true)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Appreciation:</span>
                    <span className="text-teal-700 font-semibold">
                      +{formatCurrency(summary.appreciationGain10Yr, true)}
                    </span>
                  </div>
                </div>
              </div>

              {/* KPI 4: TOTAL TAX SAVINGS */}
              <div className="bg-white rounded-2xl p-5 border border-stone-200/90 shadow-sm flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-mono uppercase tracking-wider text-stone-500">
                      Total Tax Savings
                    </span>
                    <ShieldCheck className="w-4 h-4 text-indigo-600" />
                  </div>

                  <div className="mt-2.5">
                    <span className="text-2xl sm:text-3xl font-bold font-mono-tabular text-indigo-700">
                      {formatCurrency(summary.totalTaxSavings10Yr)}
                    </span>
                  </div>
                </div>

                <div className="mt-3 pt-2.5 border-t border-stone-100 flex items-center justify-between text-xs text-stone-500">
                  <span>Marginal Shield ({params.marginalTaxBracket}%)</span>
                  <span className="font-mono font-medium text-indigo-700">
                    ~{formatCurrency(summary.totalTaxSavings10Yr / 120)}/mo avg
                  </span>
                </div>
              </div>
            </div>

            {/* PRIMARY INTERACTIVE 10-YEAR COMPARISON CHART */}
            <TenYearComparisonChart
              simulation={simulation}
              chartMode={chartMode}
              setChartMode={setChartMode}
            />

            {/* 10-YEAR CUMULATIVE COMPONENT BAR BREAKDOWN */}
            <div className="bg-white rounded-2xl border border-stone-200/90 shadow-sm p-5 sm:p-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
                <div>
                  <h3 className="text-base font-bold text-stone-900 font-serif-display">
                    10-Year Cumulative Cash & Equity Architecture
                  </h3>
                  <p className="text-xs text-stone-500">
                    How every dollar of buyer outflows, tax deductions, equity creation, and renter portfolio compounding stacks up at Year 10
                  </p>
                </div>
                <span className="text-xs font-mono text-stone-500 bg-stone-100 px-2.5 py-1 rounded-lg border border-stone-200 self-start">
                  Yr 10 Home Value: {formatCurrency(summary.finalPropertyValue)}
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Buyer 10-Year Ledger */}
                <div className="p-4 rounded-xl bg-stone-50/90 border border-stone-200/80 space-y-2.5">
                  <div className="flex items-center justify-between border-b border-stone-200 pb-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-teal-800 flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-teal-700" />
                      Buyer 10-Year Ledger
                    </span>
                    <span className="text-xs font-mono font-bold text-teal-800">
                      Net Equity: {formatCurrency(summary.netLiquidationEquity)}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="p-2 rounded-lg bg-white border border-stone-200/60">
                      <div className="text-[11px] text-stone-500">Down Payment + Principal</div>
                      <div className="font-mono font-semibold text-stone-900 mt-0.5">
                        {formatCurrency(
                          summary.downPaymentInitial + summary.principalPaid10Yr
                        )}
                      </div>
                    </div>
                    <div className="p-2 rounded-lg bg-white border border-stone-200/60">
                      <div className="text-[11px] text-stone-500">10-Yr Price Appreciation</div>
                      <div className="font-mono font-semibold text-teal-700 mt-0.5">
                        +{formatCurrency(summary.appreciationGain10Yr)}
                      </div>
                    </div>
                    <div className="p-2 rounded-lg bg-white border border-stone-200/60">
                      <div className="text-[11px] text-stone-500">Mortgage Interest Paid</div>
                      <div className="font-mono font-semibold text-stone-700 mt-0.5">
                        {formatCurrency(summary.totalInterestPaid10Yr)}
                      </div>
                    </div>
                    <div className="p-2 rounded-lg bg-white border border-stone-200/60">
                      <div className="text-[11px] text-stone-500">Service Charges + Prop Tax</div>
                      <div className="font-mono font-semibold text-stone-700 mt-0.5">
                        {formatCurrency(
                          summary.totalServiceCharges10Yr +
                            summary.totalPropertyTax10Yr
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Renter 10-Year Ledger */}
                <div className="p-4 rounded-xl bg-stone-50/90 border border-stone-200/80 space-y-2.5">
                  <div className="flex items-center justify-between border-b border-stone-200 pb-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-orange-800 flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-orange-700" />
                      Renter 10-Year Ledger
                    </span>
                    <span className="text-xs font-mono font-bold text-orange-800">
                      Portfolio: {formatCurrency(summary.finalRenterPortfolio)}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="p-2 rounded-lg bg-white border border-stone-200/60">
                      <div className="text-[11px] text-stone-500">Initial Capital Invested</div>
                      <div className="font-mono font-semibold text-stone-900 mt-0.5">
                        {formatCurrency(
                          upfront.downPayment + upfront.buyingClosingCosts
                        )}
                      </div>
                    </div>
                    <div className="p-2 rounded-lg bg-white border border-stone-200/60">
                      <div className="text-[11px] text-stone-500">Compounded Market Return</div>
                      <div className="font-mono font-semibold text-orange-700 mt-0.5">
                        +{formatCurrency(
                          yearlyData[9]?.cumulativeOpportunityGain || 0
                        )}
                      </div>
                    </div>
                    <div className="p-2 rounded-lg bg-white border border-stone-200/60">
                      <div className="text-[11px] text-stone-500">Total 10-Yr Rent Paid</div>
                      <div className="font-mono font-semibold text-stone-700 mt-0.5">
                        {formatCurrency(summary.totalRentPaid10Yr)}
                      </div>
                    </div>
                    <div className="p-2 rounded-lg bg-white border border-stone-200/60">
                      <div className="text-[11px] text-stone-500">Yr 1 vs Yr 10 Monthly Rent</div>
                      <div className="font-mono font-semibold text-stone-700 mt-0.5">
                        {formatCurrency(params.monthlyRent)} →{' '}
                        {formatCurrency(yearlyData[9]?.annualRentOutflow / 12)}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* YEAR-BY-YEAR AMORTIZATION, SERVICE CHARGE, TAX DEDUCTION & CASH-FLOW TABLE */}
            <div className="bg-white rounded-2xl border border-stone-200/90 shadow-sm overflow-hidden">
              <div className="p-5 sm:px-6 border-b border-stone-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base sm:text-lg font-bold text-stone-900 font-serif-display">
                      Year-by-Year Amortization, Service Charge, Tax Shield & Cash-Flow Ledger
                    </h3>
                  </div>
                  <p className="text-xs text-stone-500 mt-0.5">
                    Click any year row to inspect the underlying Principal vs. Interest split and monthly figures.
                  </p>
                </div>

                <button
                  onClick={handleExportCSV}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium bg-stone-100 hover:bg-stone-200 text-stone-800 border border-stone-200/80 transition self-start sm:self-auto"
                >
                  <Download className="w-3.5 h-3.5 text-teal-700" />
                  <span>Export CSV</span>
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-stone-100/90 border-b border-stone-200 text-[11px] font-mono uppercase tracking-wider text-stone-600">
                      <th className="py-3 pl-4 pr-2">Year</th>
                      <th className="py-3 px-3 text-right">Property Value</th>
                      <th className="py-3 px-3 text-right">Loan Balance</th>
                      <th className="py-3 px-3 text-right">Home Equity</th>
                      <th className="py-3 px-3 text-right">Mortgage (P&I)</th>
                      <th className="py-3 px-3 text-right">Service + Tax</th>
                      <th className="py-3 px-3 text-right text-indigo-700">Tax Shield</th>
                      <th className="py-3 px-3 text-right">Annual Rent</th>
                      <th className="py-3 px-3 text-right">Opp. Portfolio</th>
                      <th className="py-3 pl-3 pr-4 text-right">Net Buy Adv.</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-200/70 text-xs font-mono-tabular">
                    {yearlyData.map((row) => {
                      const isExpanded = !!expandedYears[row.year];
                      const isBreakEvenYear =
                        summary.breakEven && summary.breakEven.year === row.year;

                      return (
                        <React.Fragment key={row.year}>
                          <tr
                            onClick={() => toggleYearExpand(row.year)}
                            className={`cursor-pointer transition-colors ${
                              isBreakEvenYear
                                ? 'bg-teal-50/60 hover:bg-teal-50'
                                : row.year % 2 === 0
                                ? 'bg-stone-50/40 hover:bg-stone-100/70'
                                : 'bg-white hover:bg-stone-100/70'
                            }`}
                          >
                            <td className="py-3 pl-4 pr-2 font-semibold text-stone-900 whitespace-nowrap">
                              <div className="flex items-center gap-1.5">
                                {isExpanded ? (
                                  <ChevronDown className="w-3.5 h-3.5 text-teal-700" />
                                ) : (
                                  <ChevronRight className="w-3.5 h-3.5 text-stone-400" />
                                )}
                                <span>Yr {row.year}</span>
                                {isBreakEvenYear && (
                                  <span
                                    className="w-2 h-2 rounded-full bg-teal-600"
                                    title="Break-Even Year"
                                  />
                                )}
                              </div>
                            </td>
                            <td className="py-3 px-3 text-right text-stone-800">
                              {formatCurrency(row.propertyValue)}
                            </td>
                            <td className="py-3 px-3 text-right text-stone-600">
                              {formatCurrency(row.remainingLoanBalance)}
                            </td>
                            <td className="py-3 px-3 text-right font-semibold text-teal-800">
                              {formatCurrency(row.netLiquidationEquity)}
                            </td>
                            <td className="py-3 px-3 text-right text-stone-700">
                              {formatCurrency(row.annualMortgagePI)}
                            </td>
                            <td className="py-3 px-3 text-right text-stone-700">
                              {formatCurrency(row.annualServiceAndTax)}
                            </td>
                            <td className="py-3 px-3 text-right font-medium text-indigo-700">
                              -{formatCurrency(row.annualTaxSavings)}
                            </td>
                            <td className="py-3 px-3 text-right text-orange-800">
                              {formatCurrency(row.annualRentOutflow)}
                            </td>
                            <td className="py-3 px-3 text-right text-stone-700">
                              {formatCurrency(row.renterPortfolio)}
                            </td>
                            <td className="py-3 pl-3 pr-4 text-right whitespace-nowrap">
                              <span
                                className={`inline-flex items-center px-2 py-0.5 rounded font-semibold ${
                                  row.netBuyAdvantage >= 0
                                    ? 'bg-teal-50 text-teal-800 border border-teal-200'
                                    : 'bg-orange-50 text-orange-800 border border-orange-200'
                                }`}
                              >
                                {row.netBuyAdvantage >= 0 ? '+' : '-'}
                                {formatCurrency(Math.abs(row.netBuyAdvantage))}
                              </span>
                            </td>
                          </tr>

                          {/* EXPANDED SUB-ROW: ANNUAL COMPONENT BREAKDOWN */}
                          {isExpanded && (
                            <tr className="bg-stone-100/80 border-b border-stone-200">
                              <td colSpan={10} className="p-4">
                                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
                                  <div className="bg-white p-3 rounded-xl border border-stone-200">
                                    <div className="text-[11px] text-stone-500 font-sans font-medium">
                                      Year {row.year} Amortization Split
                                    </div>
                                    <div className="mt-1.5 space-y-1 font-mono">
                                      <div className="flex justify-between">
                                        <span className="text-stone-500">Principal Paid:</span>
                                        <span className="text-teal-700 font-semibold">
                                          {formatCurrency(row.annualPrincipal)}
                                        </span>
                                      </div>
                                      <div className="flex justify-between">
                                        <span className="text-stone-500">Interest Paid:</span>
                                        <span className="text-stone-800">
                                          {formatCurrency(row.annualInterest)}
                                        </span>
                                      </div>
                                    </div>
                                  </div>

                                  <div className="bg-white p-3 rounded-xl border border-stone-200">
                                    <div className="text-[11px] text-stone-500 font-sans font-medium">
                                      Year {row.year} Service & Property Tax
                                    </div>
                                    <div className="mt-1.5 space-y-1 font-mono">
                                      <div className="flex justify-between">
                                        <span className="text-stone-500">Service Charges:</span>
                                        <span className="text-stone-800">
                                          {formatCurrency(row.annualServiceCharge)}
                                        </span>
                                      </div>
                                      <div className="flex justify-between">
                                        <span className="text-stone-500">Property Tax:</span>
                                        <span className="text-stone-800">
                                          {formatCurrency(row.annualPropertyTax)}
                                        </span>
                                      </div>
                                    </div>
                                  </div>

                                  <div className="bg-white p-3 rounded-xl border border-stone-200">
                                    <div className="text-[11px] text-stone-500 font-sans font-medium">
                                      Year {row.year} Tax Shield & Net Outflow
                                    </div>
                                    <div className="mt-1.5 space-y-1 font-mono">
                                      <div className="flex justify-between">
                                        <span className="text-stone-500">Tax Deduction Saved:</span>
                                        <span className="text-indigo-700 font-semibold">
                                          -{formatCurrency(row.annualTaxSavings)}
                                        </span>
                                      </div>
                                      <div className="flex justify-between">
                                        <span className="text-stone-500">Net Buyer Outflow:</span>
                                        <span className="text-stone-900 font-semibold">
                                          {formatCurrency(row.annualNetBuyOutflow)}
                                        </span>
                                      </div>
                                    </div>
                                  </div>

                                  <div className="bg-white p-3 rounded-xl border border-stone-200">
                                    <div className="text-[11px] text-stone-500 font-sans font-medium">
                                      Year {row.year} Opportunity Return
                                    </div>
                                    <div className="mt-1.5 space-y-1 font-mono">
                                      <div className="flex justify-between">
                                        <span className="text-stone-500">Portfolio Return:</span>
                                        <span className="text-orange-700 font-semibold">
                                          +{formatCurrency(row.annualOpportunityGain)}
                                        </span>
                                      </div>
                                      <div className="flex justify-between">
                                        <span className="text-stone-500">Monthly Rent:</span>
                                        <span className="text-stone-800">
                                          {formatCurrency(row.annualRentOutflow / 12)}/mo
                                        </span>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })}
                  </tbody>

                  {/* 10-YEAR CUMULATIVE SUMMARY FOOTER */}
                  <tfoot>
                    <tr className="bg-stone-900 text-white font-mono-tabular text-xs font-semibold">
                      <td className="py-3.5 pl-4 pr-2">10-Yr End</td>
                      <td className="py-3.5 px-3 text-right">
                        {formatCurrency(summary.finalPropertyValue)}
                      </td>
                      <td className="py-3.5 px-3 text-right text-stone-300">
                        {formatCurrency(summary.finalLoanBalance)}
                      </td>
                      <td className="py-3.5 px-3 text-right text-teal-300">
                        {formatCurrency(summary.netLiquidationEquity)}
                      </td>
                      <td className="py-3.5 px-3 text-right">
                        {formatCurrency(
                          summary.principalPaid10Yr + summary.totalInterestPaid10Yr
                        )}
                      </td>
                      <td className="py-3.5 px-3 text-right">
                        {formatCurrency(
                          summary.totalServiceCharges10Yr +
                            summary.totalPropertyTax10Yr
                        )}
                      </td>
                      <td className="py-3.5 px-3 text-right text-indigo-300">
                        -{formatCurrency(summary.totalTaxSavings10Yr)}
                      </td>
                      <td className="py-3.5 px-3 text-right text-orange-300">
                        {formatCurrency(summary.totalRentPaid10Yr)}
                      </td>
                      <td className="py-3.5 px-3 text-right">
                        {formatCurrency(summary.finalRenterPortfolio)}
                      </td>
                      <td className="py-3.5 pl-3 pr-4 text-right">
                        <span
                          className={`px-2 py-0.5 rounded ${
                            summary.tenYearNetAdvantage >= 0
                              ? 'bg-teal-500/20 text-teal-200 border border-teal-400/40'
                              : 'bg-orange-500/20 text-orange-200 border border-orange-400/40'
                          }`}
                        >
                          {summary.tenYearNetAdvantage >= 0 ? '+' : '-'}
                          {formatCurrency(Math.abs(summary.tenYearNetAdvantage))}
                        </span>
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          </section>
        </div>
      </main>

      {/* METHODOLOGY & FORMULA INSPECTOR MODAL */}
      {showMethodologyModal && (
        <div className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full border border-stone-200 shadow-2xl overflow-hidden">
            <div className="px-6 py-4 bg-stone-50 border-b border-stone-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Scale className="w-5 h-5 text-teal-700" />
                <h3 className="text-base font-bold text-stone-900 font-serif-display">
                  120-Month Financial Simulation Methodology
                </h3>
              </div>
              <button
                onClick={() => setShowMethodologyModal(false)}
                className="text-xs font-mono px-2.5 py-1 rounded-lg bg-stone-200/80 text-stone-700 hover:bg-stone-300"
              >
                Close [ESC]
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs text-stone-600 leading-relaxed max-h-[75vh] overflow-y-auto">
              <div>
                <h4 className="font-bold text-stone-900 text-sm mb-1">
                  1. Fixed-Rate Mortgage Amortization
                </h4>
                <p>
                  The loan principal <code className="font-mono text-stone-800">L = Price × (1 - DownPayment%)</code> is amortized monthly over the selected loan term (15, 20, or 30 years). Each month <code className="font-mono text-stone-800">m</code>, interest equals <code className="font-mono text-stone-800">Balance × (Rate / 12)</code>, and the remainder of the fixed P&amp;I payment reduces loan principal.
                </p>
              </div>

              <div>
                <h4 className="font-bold text-stone-900 text-sm mb-1">
                  2. Service Charges, Property Taxes &amp; Marginal Tax Shield
                </h4>
                <p>
                  Monthly service charges escalate annually at the chosen inflation rate. Property taxes are assessed monthly against the appreciating property value. Deductible mortgage interest and property taxes generate an immediate monthly tax shield equal to <code className="font-mono text-stone-800">(Deductible Interest + Property Tax) × Marginal Tax Bracket %</code>.
                </p>
              </div>

              <div>
                <h4 className="font-bold text-stone-900 text-sm mb-1">
                  3. Opportunity Cost &amp; Renter Investment Portfolio
                </h4>
                <p>
                  To ensure an apples-to-apples wealth comparison, the Renter starts with an investment portfolio equal to the Buyer&apos;s upfront capital (Down Payment + Closing Costs) compounded monthly at the <strong>Investment Opportunity Cost Return Rate</strong>. Every month, the net cash-flow difference <code className="font-mono text-stone-800">(Buyer Net Outflow − Monthly Rent)</code> is contributed to (or drawn from) the Renter&apos;s investment portfolio.
                </p>
              </div>

              <div>
                <h4 className="font-bold text-stone-900 text-sm mb-1">
                  4. Net Advantage &amp; Break-Even Horizon
                </h4>
                <p>
                  At any month <code className="font-mono text-stone-800">m</code>, <strong>Net Buy Advantage</strong> equals <code className="font-mono text-stone-800">Buyer Net Home Equity − Renter Investment Portfolio</code>. The Break-Even Year marks the exact month where Buyer Net Home Equity overtakes the Renter&apos;s compounded investment portfolio.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}