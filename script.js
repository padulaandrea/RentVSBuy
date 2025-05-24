// script.js

let netWorthChartInstance = null;
let unrecoverableCostsChartInstance = null;

/**
 * Retrieves and processes input values from the form.
 * Converts percentage inputs to decimal format.
 * @returns {object} An object containing all processed input values.
 */
function getInputs() {
    const inputs = {};

    // Helper function to get and parse float value
    const getFloatValue = (id) => parseFloat(document.getElementById(id).value) || 0;
    // Helper function to get and parse float value for percentages, converting to decimal
    const getPercentageValue = (id) => parseFloat(document.getElementById(id).value) / 100 || 0;

    // Financial Inputs
    inputs.netMonthlyPay = getFloatValue('netMonthlyPay');
    inputs.monthlyExpenses = getFloatValue('monthlyExpenses');
    inputs.additionalBonus = getFloatValue('additionalBonus'); // This is an annual amount
    inputs.aduMonthlyIncome = getFloatValue('aduMonthlyIncome'); // ADU Income
    inputs.HOA = getFloatValue('HOA'); // HOA
    // Home Purchase Inputs
    inputs.homePrice = getFloatValue('homePrice');
    inputs.downPaymentPercentDecimal = getPercentageValue('downPaymentPercent');
    inputs.interestRateDecimal = getPercentageValue('interestRate'); // Annual interest rate
    inputs.propertyTaxRateDecimal = getPercentageValue('propertyTaxRate'); // Annual rate
    inputs.homeInsuranceRateDecimal = getPercentageValue('homeInsuranceRate'); // Annual rate of home value
    inputs.monthlyMaintenance = getFloatValue('monthlyMaintenance');
    inputs.buyingClosingCostsPercentDecimal = getPercentageValue('buyingClosingCostsPercent');

    // Renting Inputs
    inputs.monthlyRent = getFloatValue('monthlyRent');
    inputs.annualRentIncreaseDecimal = getPercentageValue('annualRentIncrease');

    // Investment/Market Inputs
    inputs.spyReturnDecimal = getPercentageValue('spyReturn'); // S&P 500 annual return
    inputs.homeAppreciationDecimal = getPercentageValue('homeAppreciation'); // Annual home appreciation

    // Savings
    inputs.currentSavings = getFloatValue('currentSavings');

    console.log("Inputs processed:", inputs);
    return inputs;
}

/**
 * Calculates renting scenario details year by year.
 * @param {object} inputs - The processed input values from getInputs().
 * @returns {Array<object>} An array of objects, each representing a year's data.
 */
function calculateRentingScenario(inputs) {
    console.log("calculateRentingScenario received inputs:", inputs);
    const yearsToSimulate = 30;
    const rentResults = [];

    let currentAnnualRent = inputs.monthlyRent * 12;
    let investedAssets = inputs.currentSavings;
    let totalRentPaid = 0;
    let currentMonthlyExpenses = inputs.monthlyExpenses; // Initialize currentMonthlyExpenses
    let netMonthlyPay = inputs.netMonthlyPay;
    // Extracting necessary inputs for clarity
    const {
        annualRentIncreaseDecimal,
        additionalBonus,
        spyReturnDecimal
    } = inputs;

    for (let year = 1; year <= yearsToSimulate; year++) {
        const beginningInvestedSavings = investedAssets; // Store beginning of year savings

        if (year > 1) {
            currentAnnualRent *= (1 + annualRentIncreaseDecimal);
            currentMonthlyExpenses *= 1.03; // Apply 3% inflation to monthly expenses
            netMonthlyPay *=1.03
        }

        const monthlyRentForYear = currentAnnualRent / 12;
        const calculatedNetMonthlyIncome = netMonthlyPay + (additionalBonus / 12);

        const annualLivingExpenses = currentMonthlyExpenses * 12;

        // This is the cash flow available for investment from this year's income
        const monthlyInvestedFromIncome = calculatedNetMonthlyIncome - monthlyRentForYear - currentMonthlyExpenses;
        const annualInvestedFromIncome = monthlyInvestedFromIncome * 12;

        // Add this year's savings from income to invested assets
        investedAssets += annualInvestedFromIncome;
        // Then apply S&P return to the new total (including this year's savings)
        investedAssets *= (1 + spyReturnDecimal);

        totalRentPaid += currentAnnualRent;

        rentResults.push({
            year: year,
            monthlyRent: monthlyRentForYear,
            annualRent: currentAnnualRent,
            cumulativeRentPaid: totalRentPaid, // This is totalUnrecoverableCost for renting
            // netMonthlyPay: netMonthlyPay, // Echoing input, might not be needed if calculatedNetMonthlyIncome is present
            currentMonthlyExpenses: currentMonthlyExpenses,
            monthlyInvestedFromIncome: monthlyInvestedFromIncome,
            annualInvestedFromIncome: annualInvestedFromIncome,
            beginningInvestedSavings: beginningInvestedSavings,
            netWorth: investedAssets,
            calculatedNetMonthlyIncome: calculatedNetMonthlyIncome,
            totalUnrecoverableCost: totalRentPaid // Explicitly using the same value for consistency
        });
    }

    console.log("Renting Scenario Results:", rentResults);
    return rentResults;
}

/**
 * Calculates buying scenario details year by year.
 * @param {object} inputs - The processed input values from getInputs().
 * @returns {Array<object>} An array of objects, each representing a year's data for the buying scenario.
 */
function calculateBuyingScenario(inputs) {
    console.log("calculateBuyingScenario received inputs:", inputs);
    const yearsToSimulate = 30;
    const buyResults = [];
    let totalUnrecoverableBuyCosts = 0;
    let currentMonthlyExpenses = inputs.monthlyExpenses;
    let currentMonthlyPropertyTax = (inputs.homePrice * inputs.propertyTaxRateDecimal) / 12;
    let cumulativeOutlay = 0;
    let netMonthlyPay = inputs.netMonthlyPay;
    let aduMonthlyIncome = inputs.aduMonthlyIncome;
    const {
        homePrice,
        downPaymentPercentDecimal,
        interestRateDecimal,
        propertyTaxRateDecimal,
        homeInsuranceRateDecimal,
        monthlyMaintenance,
        homeAppreciationDecimal,
        monthlyExpenses, // Assumed to be non-housing general expenses
        spyReturnDecimal,
        buyingClosingCostsPercentDecimal,
        currentSavings,
        additionalBonus,
        HOA,
    } = inputs;

    // Initial Purchase Calculations
    const downPaymentAmount = homePrice * downPaymentPercentDecimal;
    const closingCosts = homePrice * buyingClosingCostsPercentDecimal;
    const initialCashOutlay = downPaymentAmount + closingCosts;
    const loanAmount = homePrice - downPaymentAmount;
    const monthlyInterestRate = interestRateDecimal / 12;
    const numberOfPayments = yearsToSimulate * 12;

    let monthlyMortgagePayment;
    if (monthlyInterestRate === 0) {
        monthlyMortgagePayment = loanAmount / numberOfPayments;
    } else {
        monthlyMortgagePayment = loanAmount *
            (monthlyInterestRate * Math.pow(1 + monthlyInterestRate, numberOfPayments)) /
            (Math.pow(1 + monthlyInterestRate, numberOfPayments) - 1);
    }

    if (loanAmount <= 0) { // Handles cases like 100% down payment or invalid home price
        monthlyMortgagePayment = 0;
    }


    let currentHomeValue = homePrice;
    let remainingLoanBalance = loanAmount;
    let investedAssets = currentSavings - initialCashOutlay;

    // Edge case: if not enough savings for initial outlay.
    // This could be handled by returning an error or an empty array,
    // or by allowing investedAssets to be negative. For now, we proceed.
    if (investedAssets < 0) {
        console.warn("Warning: Initial cash outlay exceeds current savings. Invested assets start negative.");
    }

    for (let year = 1; year <= yearsToSimulate; year++) {
        const beginningInvestedSavings = investedAssets; // Store at start of year
        let interestPaidThisYear = 0;
        let principalPaidThisYear = 0;

        if (year > 1) {
            currentMonthlyExpenses *= 1.03;
            currentMonthlyPropertyTax *= 1.02;
            netMonthlyPay *=1.03;
            aduMonthlyIncome *=1.03;
        }

        // Mortgage P&I calculation (remains the same as it's based on fixed loan terms)
        const annualMortgagePaymentsFixed = monthlyMortgagePayment * 12;
        let actualAnnualMortgagePaidThisYear = 0;

        if (remainingLoanBalance > 0) {
            for (let month = 0; month < 12; month++) {
                if (remainingLoanBalance <= 0) break; // Loan paid off mid-year

                let monthlyInterest = remainingLoanBalance * monthlyInterestRate;
                let monthlyPrincipal = monthlyMortgagePayment - monthlyInterest;

                if (monthlyPrincipal > remainingLoanBalance) { // Final payment adjustment
                    monthlyPrincipal = remainingLoanBalance;
                    // monthlyMortgagePayment for this last payment would effectively be remainingLoanBalance + monthlyInterest
                }
                if (monthlyInterestRate === 0 && loanAmount > 0) { // No interest, principal is just fixed payment
                    monthlyPrincipal = monthlyMortgagePayment; // Assuming loanAmount > 0
                    monthlyInterest = 0;
                }

                if (loanAmount <= 0) { // No loan
                    monthlyInterest = 0;
                    monthlyPrincipal = 0;
                }


                interestPaidThisYear += monthlyInterest;
                principalPaidThisYear += monthlyPrincipal;
                remainingLoanBalance -= monthlyPrincipal;

                if (remainingLoanBalance < 0.01) { // Handle floating point inaccuracies
                    remainingLoanBalance = 0;
                }
            }
        }

        // If loanAmount was 0 initially, all mortgage related payments are 0
        actualAnnualMortgagePaidThisYear = (loanAmount > 0) ? (interestPaidThisYear + principalPaidThisYear) : 0;

        // Yearly costs based on potentially updated values
        const annualPropertyTaxThisYear = currentMonthlyPropertyTax * 12;
        const monthlyHomeInsurance = (currentHomeValue * inputs.homeInsuranceRateDecimal) / 12;
        const annualHomeInsuranceThisYear = monthlyHomeInsurance * 12;
        const annualMaintenanceThisYear = inputs.monthlyMaintenance * 12; // Constant based on input
        const annualHOA = inputs.HOA *12;

        const totalAnnualHousingCosts = actualAnnualMortgagePaidThisYear + annualPropertyTaxThisYear + annualHomeInsuranceThisYear + annualMaintenanceThisYear+annualHOA;

        const netMonthlyPayForCalc = netMonthlyPay + (additionalBonus / 12) + aduMonthlyIncome;
        const annualNetIncomeInclADU = netMonthlyPayForCalc * 12;
        const annualLivingExpenses = currentMonthlyExpenses * 12;

        const annualInvestedFromIncome = annualNetIncomeInclADU - totalAnnualHousingCosts - annualLivingExpenses;

        investedAssets += annualInvestedFromIncome;
        investedAssets *= (1 + spyReturnDecimal);

        if (year > 1 || homeAppreciationDecimal !== 0) {
             currentHomeValue *= (1 + homeAppreciationDecimal);
        }

        const homeEquityNetOfSaleCost = (currentHomeValue * 0.94) - (remainingLoanBalance > 0 ? remainingLoanBalance : 0);
        const netWorth = homeEquityNetOfSaleCost + investedAssets;

        const unrecoverableCostsThisYear = interestPaidThisYear + annualPropertyTaxThisYear + annualHomeInsuranceThisYear + annualMaintenanceThisYear;
        totalUnrecoverableBuyCosts += unrecoverableCostsThisYear;

        const totalMonthlyOutlay = actualAnnualMortgagePaidThisYear/12 + currentMonthlyPropertyTax + monthlyHomeInsurance + inputs.monthlyMaintenance + inputs.HOA;
        cumulativeOutlay += totalAnnualHousingCosts;


        buyResults.push({
            year: year,
            mortgageBalance: (remainingLoanBalance > 0 ? remainingLoanBalance : 0),
            principalPaidAnnual: principalPaidThisYear,
            interestPaidAnnual: interestPaidThisYear,
            monthlyPI: monthlyMortgagePayment, // Fixed monthly P&I
            currentMonthlyPropertyTax: currentMonthlyPropertyTax,
            monthlyHomeInsurance: monthlyHomeInsurance,
            monthlyMaintenance: inputs.monthlyMaintenance,
            totalMonthlyOutlay: totalMonthlyOutlay,
            HOA: inputs.HOA,
            annualTotalOutlay: totalAnnualHousingCosts, // Use the consistent totalAnnualHousingCosts
            cumulativeOutlay: cumulativeOutlay,
            currentMonthlyExpenses: currentMonthlyExpenses,
            netMonthlyPayInclADU: netMonthlyPayForCalc,
            monthlyInvestedFromIncome: annualInvestedFromIncome / 12, // Derive from annual
            annualInvestedFromIncome: annualInvestedFromIncome,
            beginningInvestedSavings: beginningInvestedSavings,
            homeValue: currentHomeValue,
            homeEquityNetProfitFromSale: homeEquityNetOfSaleCost,
            totalUnrecoverableCost: totalUnrecoverableBuyCosts,
            netWorth: netWorth
        });
    }

    console.log("Buying Scenario Results:", buyResults);
    return buyResults;
}

/**
 * Formats a number as a currency string (USD).
 * @param {number} amount - The number to format.
 * @returns {string} A string representing the formatted currency.
 */
function formatCurrency(amount) {
    if (typeof amount !== 'number') {
        return 'N/A';
    }
    return amount.toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 0 });
}


/**
 * Displays a summary of the user's inputs and key derived values.
 * @param {object} inputs - The processed input values from getInputs().
 */
function displayInputSummary(inputs) {
    const summaryContainer = document.getElementById('input-summary-container');
    summaryContainer.innerHTML = ''; // Clear previous summary

    // --- 1. Calculate Derived Values ---
    const {
        homePrice,
        downPaymentPercentDecimal,
        interestRateDecimal, // This is already a decimal from getInputs
        buyingClosingCostsPercentDecimal,
        currentSavings,
        propertyTaxRateDecimal,
        homeInsuranceRateDecimal,
        monthlyMaintenance,
        monthlyRent,
        netMonthlyPay,
        additionalBonus,
        monthlyExpenses,
        HOA,
        aduMonthlyIncome // Destructure for summary
    } = inputs;

    const downPaymentAmount = homePrice * downPaymentPercentDecimal;
    const closingCostsAmount = homePrice * buyingClosingCostsPercentDecimal;
    const totalUpfrontCosts = downPaymentAmount + closingCostsAmount;
    const loanAmount = homePrice - downPaymentAmount;
    const savingsAfterUpfrontCosts = currentSavings - totalUpfrontCosts;

    const monthlyInterestRate = interestRateDecimal / 12;
    const numberOfPayments = 30 * 12; // Assuming 30 years
    let monthlyMortgagePayment = 0;
    if (loanAmount <= 0) {
        monthlyMortgagePayment = 0;
    } else if (monthlyInterestRate > 0) {
        monthlyMortgagePayment = loanAmount * (monthlyInterestRate * Math.pow(1 + monthlyInterestRate, numberOfPayments)) / (Math.pow(1 + monthlyInterestRate, numberOfPayments) - 1);
    } else { // No interest, loanAmount > 0
        monthlyMortgagePayment = loanAmount / numberOfPayments;
    }

    const monthlyPropertyTax = (homePrice * propertyTaxRateDecimal) / 12;
    const monthlyHomeInsurance = (homePrice * homeInsuranceRateDecimal) / 12;
    const totalMonthlyHousingCostsBuy = monthlyMortgagePayment + monthlyPropertyTax + monthlyHomeInsurance + monthlyMaintenance +HOA;

    // Include ADU income in net monthly income for summary calculation
    const netMonthlyIncome = netMonthlyPay + (additionalBonus / 12);
    const savingsSurplusRenting = netMonthlyIncome - monthlyExpenses - monthlyRent ; // ADU income not available when renting
    const savingsSurplusBuying = netMonthlyIncome - monthlyExpenses - totalMonthlyHousingCostsBuy + aduMonthlyIncome;


    // --- 2. Create Table Structure ---
    const table = document.createElement('table');
    const tbody = table.createTBody();

    // Helper function to add section headers
    function addSectionHeader(tbody, title) {
        const row = tbody.insertRow();
        const cell = row.insertCell();
        cell.colSpan = 2;
        cell.textContent = title;
        // Styling will be handled by CSS for #input-summary-container th, but we can add a class or specific style if needed
        // For now, using existing CSS which has a th style. If we want to make it look like a th:
        cell.style.fontWeight = 'bold';
        cell.style.backgroundColor = '#f0f0f0'; // Match CSS for th in input summary
        cell.style.padding = '8px 10px'; // Match CSS
        cell.style.textAlign = 'left'; // Match CSS
    }

    // Helper function to add rows
    function addSummaryRow(tbody, label, value, formatType = 'currency') {
        const row = tbody.insertRow();
        const cellLabel = row.insertCell();
        cellLabel.textContent = label;
        const cellValue = row.insertCell();

        if (value === undefined || value === null || (typeof value === 'number' && isNaN(value))) {
            cellValue.textContent = 'N/A';
        } else if (formatType === 'currency') {
            cellValue.textContent = formatCurrency(value);
        } else if (formatType === 'percent') {
            // value is expected to be already scaled (e.g., 20 for 20%)
            let digits = 0;
            if (value < 0.001 && value !== 0) digits = 4; // For very small rates if needed
            else if (value < 10 && value !== Math.floor(value)) digits = 2;
            else if (value < 1 && value !== 0) digits = 2;
            cellValue.textContent = value.toFixed(digits) + '%';
        } else { // 'number'
            cellValue.textContent = typeof value === 'number' ? value.toLocaleString() : value;
        }
    }

    // --- 3. Populate Table ---
    addSectionHeader(tbody, 'Key Inputs');
    addSummaryRow(tbody, 'Home Price:', homePrice, 'currency');
    addSummaryRow(tbody, 'Down Payment Percent:', downPaymentPercentDecimal * 100, 'percent');
    addSummaryRow(tbody, 'Interest Rate (Annual):', interestRateDecimal * 100, 'percent');
    addSummaryRow(tbody, 'Monthly ADU Rent Income:', aduMonthlyIncome, 'currency'); // Display ADU Income
    addSummaryRow(tbody, 'Current Savings:', currentSavings, 'currency');


    addSectionHeader(tbody, 'Upfront Costs (Buying)');
    addSummaryRow(tbody, 'Down Payment Amount:', downPaymentAmount, 'currency');
    addSummaryRow(tbody, 'Closing Costs:', closingCostsAmount, 'currency');
    addSummaryRow(tbody, 'Total Upfront Costs:', totalUpfrontCosts, 'currency');
    addSummaryRow(tbody, 'Loan Amount:', loanAmount, 'currency');
    addSummaryRow(tbody, 'Savings After Upfront Costs:', savingsAfterUpfrontCosts, 'currency');

    addSectionHeader(tbody, 'Estimated Monthly Costs (Buy - Initial)');
    addSummaryRow(tbody, 'Mortgage Principal & Interest:', monthlyMortgagePayment, 'currency');
    addSummaryRow(tbody, 'Property Tax:', monthlyPropertyTax, 'currency');
    addSummaryRow(tbody, 'Home Insurance:', monthlyHomeInsurance, 'currency');
    addSummaryRow(tbody, 'Maintenance:', monthlyMaintenance, 'currency');
    addSummaryRow(tbody, 'HOA:', HOA, 'currency');
    addSummaryRow(tbody, 'Total Monthly Housing Costs (Buy):', totalMonthlyHousingCostsBuy, 'currency');

    addSectionHeader(tbody, 'Estimated Monthly Costs (Rent - Initial)');
    addSummaryRow(tbody, 'Monthly Rent:', monthlyRent, 'currency');

    addSectionHeader(tbody, 'Estimated Monthly Cash Flow (Initial)');
    addSummaryRow(tbody, 'Net Monthly Income:', netMonthlyIncome, 'currency');
    addSummaryRow(tbody, 'Monthly Non-Housing Expenses:', monthlyExpenses, 'currency');
    addSummaryRow(tbody, 'Additional Monthly Income (Buying):', aduMonthlyIncome, 'currency');
    addSummaryRow(tbody, 'Savings Surplus (Renting):', savingsSurplusRenting, 'currency');
    addSummaryRow(tbody, 'Savings Surplus (Buying):', savingsSurplusBuying, 'currency');

    // --- 4. Append Table to Container ---
    summaryContainer.appendChild(table);
}


/**
 * Displays the calculation results in a table and a summary.
 * @param {Array<object>} rentData - Array of yearly data from calculateRentingScenario.
 * @param {Array<object>} buyData - Array of yearly data from calculateBuyingScenario.
 */
function displayResults(rentData, buyData) {
    console.log("Displaying results for:", rentData, buyData);
    const resultsContainer = document.getElementById('results-container');
    resultsContainer.innerHTML = ''; // Clear previous results

    if (!rentData || !buyData || rentData.length === 0 || buyData.length === 0) {
        resultsContainer.textContent = 'Calculation data is missing or incomplete. Please check your inputs and try again.';
        return;
    }

    // Create Table
    const table = document.createElement('table');
    table.classList.add('results-table'); // For specific styling if needed

    // Create Table Header
    const thead = table.createTHead();
    const headerRow = thead.insertRow();
    const headers = ['Year', 'Renting Net Worth', 'Buying Net Worth', 'Better Option'];
    headers.forEach(text => {
        const th = document.createElement('th');
        th.textContent = text;
        headerRow.appendChild(th);
    });

    // Create Table Body
    const tbody = table.createTBody();
    let breakEvenYear = -1;
    let firstTimeBuyIsBetter = true; // To capture the first break-even year

    for (let i = 0; i < rentData.length; i++) {
        // Ensure buyData also has an entry for this index
        if (i >= buyData.length) {
            console.warn(`Missing buyData for year index ${i}.`);
            continue; // Skip this iteration if data is mismatched
        }

        const yearRentData = rentData[i];
        const yearBuyData = buyData[i];
        const row = tbody.insertRow();

        // Year cell
        let cell = row.insertCell();
        cell.textContent = yearRentData.year;

        // Renting Net Worth cell
        cell = row.insertCell();
        cell.textContent = formatCurrency(yearRentData.netWorth);

        // Buying Net Worth cell
        cell = row.insertCell();
        cell.textContent = formatCurrency(yearBuyData.netWorth);

        // Better Option cell
        cell = row.insertCell();
        const isBuyBetter = yearBuyData.netWorth > yearRentData.netWorth;
        const betterOption = isBuyBetter ? 'Buy' : 'Rent';
        cell.textContent = betterOption;

        if (isBuyBetter) {
            cell.style.color = 'green';
            if (firstTimeBuyIsBetter) {
                breakEvenYear = yearBuyData.year;
                firstTimeBuyIsBetter = false; // Ensure breakEvenYear is set only once
            }
        } else {
            cell.style.color = 'orange';
        }
    }

    resultsContainer.appendChild(table);

    // Add Summary
    const summaryP = document.createElement('p');
    summaryP.style.marginTop = '20px'; // Add some spacing
    summaryP.style.fontWeight = 'bold';

    if (breakEvenYear !== -1) {
        summaryP.textContent = `Buying becomes financially preferable to renting in Year ${breakEvenYear}.`;
    } else {
        // Check if buying was ever better at the very end, in case loop logic didn't catch it
        // This check is actually redundant given the loop structure, but as a safeguard:
        if (buyData.length > 0 && rentData.length > 0 && buyData[buyData.length - 1].netWorth > rentData[rentData.length -1].netWorth && firstTimeBuyIsBetter) {
             summaryP.textContent = `Buying becomes financially preferable to renting in Year ${buyData[buyData.length - 1].year}.`;
        } else if (firstTimeBuyIsBetter) { // This means buy was never better
             summaryP.textContent = 'Renting remains financially preferable to buying over the entire simulation period.';
        } else { // This means buy became better and breakEvenYear was set
            summaryP.textContent = `Buying becomes financially preferable to renting in Year ${breakEvenYear}.`;
        }
    }
    resultsContainer.appendChild(summaryP);
}

/**
 * Displays the unrecoverable costs in a table.
 * @param {Array<object>} rentData - Array of yearly data from calculateRentingScenario.
 * @param {Array<object>} buyData - Array of yearly data from calculateBuyingScenario.
 */
function displayUnrecoverableCosts(rentData, buyData) {
    const container = document.getElementById('unrecoverable-costs-container');

    // Clear previous table if any, but keep H2 (or recreate H2 if preferred)
    const existingTable = container.querySelector('table');
    if (existingTable) {
        existingTable.remove();
    }

    if (!rentData || !buyData || rentData.length === 0 || buyData.length === 0) {
        // Optionally display a message if data is missing
        // For now, just don't create the table if data isn't there
        return;
    }

    const table = document.createElement('table');
    const thead = table.createTHead();
    const headerRow = thead.insertRow();
    const headers = ['Year', 'Total Unrecoverable (Rent)', 'Total Unrecoverable (Buy)', 'Better Option'];
    headers.forEach(text => {
        const th = document.createElement('th');
        th.textContent = text;
        headerRow.appendChild(th);
    });
    let firstTimeBuyIsBetter = true; // To capture the first break-even year
    const tbody = table.createTBody();
    for (let i = 0; i < rentData.length; i++) {
        // Check if corresponding buyData exists for safety, though they should have same length
        if (i >= buyData.length) continue;

        const yearRent = rentData[i];
        const yearBuy = buyData[i];
        const row = tbody.insertRow();

        row.insertCell().textContent = yearRent.year;
        // Ensure totalUnrecoverableCost property exists before formatting
        row.insertCell().textContent = yearRent.totalUnrecoverableCost !== undefined ? formatCurrency(yearRent.totalUnrecoverableCost) : 'N/A';
        row.insertCell().textContent = yearBuy.totalUnrecoverableCost !== undefined ? formatCurrency(yearBuy.totalUnrecoverableCost) : 'N/A';
        // Better Option cell
        cell = row.insertCell();
        const isBuyBetter = yearBuy.totalUnrecoverableCost > yearRent.totalUnrecoverableCost;
        const betterOption = isBuyBetter ? 'Buy' : 'Rent';
        cell.textContent = betterOption;

        if (isBuyBetter) {
            cell.style.color = 'green';
            if (firstTimeBuyIsBetter) {
                breakEvenYear = yearBuy.year;
                firstTimeBuyIsBetter = false; // Ensure breakEvenYear is set only once
            }
        } else {
            cell.style.color = 'orange';
        }
    }
    container.appendChild(table);
}

/**
 * Displays a detailed table of the buying scenario's yearly data.
 * @param {Array<object>} buyData - Array of yearly data from calculateBuyingScenario.
 */
function displayDetailedBuyTable(buyData) {
    const container = document.getElementById('detailed-buy-table-container');
    container.innerHTML = ''; // Clear previous table

    if (!buyData || buyData.length === 0) {
        container.textContent = 'No detailed buying data to display.';
        return;
    }

    const table = document.createElement('table');
    const thead = table.createTHead();
    const headerRow = thead.insertRow();

    const headers = [
        'Year', 'Mortgage Balance', 'Principal Paid (Annual)', 'Interest Paid (Annual)', 'Monthly P&I',
        'Monthly Property Tax (YoY 2% inc.)', 'Monthly Home Insurance', 'Monthly HOA','Monthly Maintenance',
        'Total Monthly Outlay', 'Annual Total Outlay', 'Cumulative Outlay',
        'Monthly Expenses (YoY 3% inc.)', 'Net Monthly Pay incl. ADU (YoY 3% inc.)',
        'Monthly Invested (from income)', 'Annual Invested (from income)',
        'Beginning Invested Savings', 'Home Value', 'Home Equity / Net Profit from Sale',
        'Lost Cost (Cumulative)', 'End of Year Net Worth'
    ];

    headers.forEach(text => {
        const th = document.createElement('th');
        th.textContent = text;
        headerRow.appendChild(th);
    });

    const tbody = table.createTBody();
    buyData.forEach(dataYear => {
        const row = tbody.insertRow();
        row.insertCell().textContent = dataYear.year;
        row.insertCell().textContent = formatCurrency(dataYear.mortgageBalance);
        row.insertCell().textContent = formatCurrency(dataYear.principalPaidAnnual);
        row.insertCell().textContent = formatCurrency(dataYear.interestPaidAnnual);
        row.insertCell().textContent = formatCurrency(dataYear.monthlyPI);
        row.insertCell().textContent = formatCurrency(dataYear.currentMonthlyPropertyTax);
        row.insertCell().textContent = formatCurrency(dataYear.monthlyHomeInsurance);
        row.insertCell().textContent = formatCurrency(dataYear.HOA);
        row.insertCell().textContent = formatCurrency(dataYear.monthlyMaintenance);
        row.insertCell().textContent = formatCurrency(dataYear.totalMonthlyOutlay);
        row.insertCell().textContent = formatCurrency(dataYear.annualTotalOutlay);
        row.insertCell().textContent = formatCurrency(dataYear.cumulativeOutlay);
        row.insertCell().textContent = formatCurrency(dataYear.currentMonthlyExpenses);
        row.insertCell().textContent = formatCurrency(dataYear.netMonthlyPayInclADU);
        row.insertCell().textContent = formatCurrency(dataYear.monthlyInvestedFromIncome);
        row.insertCell().textContent = formatCurrency(dataYear.annualInvestedFromIncome);
        row.insertCell().textContent = formatCurrency(dataYear.beginningInvestedSavings);
        row.insertCell().textContent = formatCurrency(dataYear.homeValue);
        row.insertCell().textContent = formatCurrency(dataYear.homeEquityNetProfitFromSale);
        row.insertCell().textContent = formatCurrency(dataYear.totalUnrecoverableCost); // Matches 'Lost Cost (Cumulative)'
        row.insertCell().textContent = formatCurrency(dataYear.netWorth);
    });

    container.appendChild(table);
}

/**
 * Displays a detailed table of the renting scenario's yearly data.
 * @param {Array<object>} rentData - Array of yearly data from calculateRentingScenario.
 */
function displayDetailedRentTable(rentData) {
    const container = document.getElementById('detailed-rent-table-container');
    container.innerHTML = ''; // Clear previous table

    if (!rentData || rentData.length === 0) {
        container.textContent = 'No detailed renting data to display.';
        return;
    }

    const table = document.createElement('table');
    const thead = table.createTHead();
    const headerRow = thead.insertRow();

    const headers = [
        'Year', 'Monthly Rent', 'Annual Rent', 'Cumulative Rent Paid',
        'Calculated Net Monthly Income(YoY 3% inc.)', 'Monthly Expenses (YoY 3% inc.)',
        'Monthly Invested (from income)', 'Annual Invested (from income)',
        'Beginning Invested Savings', 'End of Year Net Worth'
    ];

    headers.forEach(text => {
        const th = document.createElement('th');
        th.textContent = text;
        headerRow.appendChild(th);
    });

    const tbody = table.createTBody();
    rentData.forEach(dataYear => {
        const row = tbody.insertRow();
        row.insertCell().textContent = dataYear.year;
        row.insertCell().textContent = formatCurrency(dataYear.monthlyRent);
        row.insertCell().textContent = formatCurrency(dataYear.annualRent);
        row.insertCell().textContent = formatCurrency(dataYear.cumulativeRentPaid); // Matches totalUnrecoverableCost
        row.insertCell().textContent = formatCurrency(dataYear.calculatedNetMonthlyIncome);
        row.insertCell().textContent = formatCurrency(dataYear.currentMonthlyExpenses);
        row.insertCell().textContent = formatCurrency(dataYear.monthlyInvestedFromIncome);
        row.insertCell().textContent = formatCurrency(dataYear.annualInvestedFromIncome);
        row.insertCell().textContent = formatCurrency(dataYear.beginningInvestedSavings);
        row.insertCell().textContent = formatCurrency(dataYear.netWorth);
    });

    container.appendChild(table);
}

/**
 * Displays charts for Net Worth and Unrecoverable Costs.
 * @param {Array<object>} rentData - Array of yearly data from calculateRentingScenario.
 * @param {Array<object>} buyData - Array of yearly data from calculateBuyingScenario.
 */
function displayCharts(rentData, buyData) {
    if (!rentData || !buyData || rentData.length === 0 || buyData.length === 0) {
        // Optionally clear charts or display a message if data is missing
        if (netWorthChartInstance) netWorthChartInstance.destroy();
        if (unrecoverableCostsChartInstance) unrecoverableCostsChartInstance.destroy();
        netWorthChartInstance = null;
        unrecoverableCostsChartInstance = null;
        return;
    }

    const years = rentData.map(d => d.year); // Assuming years are consistent

    // Data for Net Worth Chart
    const netWorthRentValues = rentData.map(d => d.netWorth);
    const netWorthBuyValues = buyData.map(d => d.netWorth);

    // Data for Unrecoverable Costs Chart
    const unrecoverableRentValues = rentData.map(d => d.totalUnrecoverableCost);
    const unrecoverableBuyValues = buyData.map(d => d.totalUnrecoverableCost);

    // Destroy previous charts if they exist
    if (netWorthChartInstance) {
        netWorthChartInstance.destroy();
    }
    if (unrecoverableCostsChartInstance) {
        unrecoverableCostsChartInstance.destroy();
    }

    // Net Worth Chart
    const nwCtx = document.getElementById('netWorthChart').getContext('2d');
    netWorthChartInstance = new Chart(nwCtx, {
        type: 'line',
        data: {
            labels: years,
            datasets: [
                {
                    label: 'Renting Net Worth',
                    data: netWorthRentValues,
                    borderColor: '#F5A623', // Vibrant Orange
                    backgroundColor: 'rgba(245, 166, 35, 0.2)',
                    tension: 0.1
                },
                {
                    label: 'Buying Net Worth',
                    data: netWorthBuyValues,
                    borderColor: '#4A90E2', // Modern Blue
                    backgroundColor: 'rgba(74, 144, 226, 0.2)',
                    tension: 0.1
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                title: { display: true, text: 'Net Worth Over Time' },
                tooltip: { callbacks: { label: (context) => `${context.dataset.label}: ${formatCurrency(context.raw)}` } }
            },
            scales: { y: { ticks: { callback: (value) => formatCurrency(value) } } }
        }
    });

    // Unrecoverable Costs Chart
    const ucCtx = document.getElementById('unrecoverableCostsChart').getContext('2d');
    unrecoverableCostsChartInstance = new Chart(ucCtx, {
        type: 'line',
        data: {
            labels: years,
            datasets: [
                {
                    label: 'Unrecoverable Costs (Rent)',
                    data: unrecoverableRentValues,
                    borderColor: '#50E3C2', // Green/Teal
                    backgroundColor: 'rgba(80, 227, 194, 0.2)',
                    tension: 0.1
                },
                {
                    label: 'Unrecoverable Costs (Buy)',
                    data: unrecoverableBuyValues,
                    borderColor: '#3B71B8', // Darker/complementary Blue
                    backgroundColor: 'rgba(59, 113, 184, 0.2)',
                    tension: 0.1
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                title: { display: true, text: 'Total Unrecoverable Costs Over Time' },
                tooltip: { callbacks: { label: (context) => `${context.dataset.label}: ${formatCurrency(context.raw)}` } }
            },
            scales: { y: { ticks: { callback: (value) => formatCurrency(value) } } }
        }
    });
}


// Event Listener for the Calculate Button
document.addEventListener('DOMContentLoaded', () => {
    const calculateButton = document.getElementById('calculateButton');

    // Helper function to synchronize number input, range slider, and output span
    function setupInputSync(numberInputId, sliderId, outputId, unit = '%') {
        const numberInput = document.getElementById(numberInputId);
        const slider = document.getElementById(sliderId);
        const output = document.getElementById(outputId);

        if (!numberInput || !slider || !output) {
            console.warn(`Skipping sync setup for: ${numberInputId}, ${sliderId}, ${outputId}. One or more elements not found.`);
            return;
        }

        // Initial display update from number input's default value
        output.textContent = numberInput.value + unit;
        // Ensure slider also matches the number input's default value initially
        slider.value = numberInput.value;


        numberInput.addEventListener('input', () => {
            // Check to prevent potential feedback loops or unnecessary updates
            if (slider.value !== numberInput.value) {
                slider.value = numberInput.value;
            }
            // Ensure output reflects the potentially constrained value of the number input
            // (e.g., if user types something out of slider's range, slider will clip it)
            // For a robust solution, one might re-set numberInput.value = slider.value here if clipping is desired.
            // For now, assume direct update is fine.
            output.textContent = numberInput.value + unit;
        });

        slider.addEventListener('input', () => {
            if (numberInput.value !== slider.value) {
                numberInput.value = slider.value;
            }
            output.textContent = slider.value + unit;
        });
    }

    // Setup synchronization for all relevant inputs
    setupInputSync('annualRentIncrease', 'annualRentIncreaseSlider', 'annualRentIncreaseSliderValueOutput');
    setupInputSync('interestRate', 'interestRateSlider', 'interestRateSliderValueOutput');
    setupInputSync('propertyTaxRate', 'propertyTaxRateSlider', 'propertyTaxRateSliderValueOutput');
    setupInputSync('homeInsuranceRate', 'homeInsuranceRateSlider', 'homeInsuranceRateSliderValueOutput');
    setupInputSync('spyReturn', 'spyReturnSlider', 'spyReturnSliderValueOutput');
    setupInputSync('homeAppreciation', 'homeAppreciationSlider', 'homeAppreciationSliderValueOutput');
    setupInputSync('downPaymentPercent', 'downPaymentPercentSlider', 'downPaymentPercentSliderValueOutput');
    setupInputSync('buyingClosingCostsPercent', 'buyingClosingCostsPercentSlider', 'buyingClosingCostsPercentSliderValueOutput');
    setupInputSync('aduMonthlyIncome', 'aduMonthlyIncomeSlider', 'aduMonthlyIncomeSliderValueOutput', '$'); // Sync for ADU
    setupInputSync('HOA','HOASlider', 'HOASliderValueOutput','$');
    // Tab Control Logic
    const tabButtonComparison = document.getElementById('tabButtonComparison');
    const tabButtonDetailed = document.getElementById('tabButtonDetailed');
    const comparisonViewTabContent = document.getElementById('comparison-view-tab-content');
    const detailedViewTabContent = document.getElementById('detailed-view-tab-content');

    if (tabButtonComparison && tabButtonDetailed && comparisonViewTabContent && detailedViewTabContent) {
        tabButtonComparison.addEventListener('click', () => {
            tabButtonComparison.classList.add('active');
            tabButtonDetailed.classList.remove('active');
            comparisonViewTabContent.classList.add('active-tab-content');
            detailedViewTabContent.classList.remove('active-tab-content');
        });

        tabButtonDetailed.addEventListener('click', () => {
            tabButtonDetailed.classList.add('active');
            tabButtonComparison.classList.remove('active');
            detailedViewTabContent.classList.add('active-tab-content');
            comparisonViewTabContent.classList.remove('active-tab-content');
        });
    } else {
        console.warn("Tab control elements not found. Tab functionality will be affected.");
    }

    if (calculateButton) {
        calculateButton.addEventListener('click', () => {
            console.log("Calculate button clicked.");
            const userInputs = getInputs();
            displayInputSummary(userInputs); // Call the new summary function
            const rentData = calculateRentingScenario(userInputs);
            const buyData = calculateBuyingScenario(userInputs);
            displayResults(rentData, buyData);
            displayUnrecoverableCosts(rentData, buyData);
            displayCharts(rentData, buyData); // Call the new chart function
            displayDetailedRentTable(rentData); // Added for detailed rent table
            displayDetailedBuyTable(buyData);   // Added for detailed buy table
        });
    } else {
        console.error("Calculate button not found!");
    }
});
