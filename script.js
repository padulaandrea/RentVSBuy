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
    let totalRentPaid = 0; // Initialize totalRentPaid

    // Extracting necessary inputs for clarity within the loop
    const {
        annualRentIncreaseDecimal,
        netMonthlyPay,
        additionalBonus,
        monthlyExpenses,
        spyReturnDecimal
    } = inputs;

    for (let year = 1; year <= yearsToSimulate; year++) {
        if (year > 1) {
            currentAnnualRent *= (1 + annualRentIncreaseDecimal);
        }

        const annualNetIncome = (netMonthlyPay * 12) + additionalBonus;
        // Assuming monthlyExpenses in inputs is purely for living, not including rent
        const annualLivingExpenses = monthlyExpenses * 12;

        // Savings this year is income minus rent minus other living expenses
        const savingsThisYear = annualNetIncome - currentAnnualRent - annualLivingExpenses;

        // Add savings to invested assets first
        investedAssets += savingsThisYear;
        // Then apply S&P return to the new total
        investedAssets *= (1 + spyReturnDecimal);
        totalRentPaid += currentAnnualRent; // Accumulate rent paid

        rentResults.push({
            year: year,
            rentPaidThisYear: currentAnnualRent,
            netWorth: investedAssets,
            savingsForYear: savingsThisYear, // For detailed analysis
            totalUnrecoverableCost: totalRentPaid // Add total unrecoverable cost
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
    let totalUnrecoverableBuyCosts = 0; // Initialize totalUnrecoverableBuyCosts

    const {
        homePrice,
        downPaymentPercentDecimal,
        interestRateDecimal,
        propertyTaxRateDecimal,
        homeInsuranceRateDecimal,
        monthlyMaintenance,
        homeAppreciationDecimal,
        netMonthlyPay,
        monthlyExpenses, // Assumed to be non-housing general expenses
        spyReturnDecimal,
        buyingClosingCostsPercentDecimal,
        currentSavings,
        additionalBonus,
        aduMonthlyIncome // Destructure new input
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
        let interestPaidThisYear = 0;
        let principalPaidThisYear = 0;
        const annualMortgagePayments = monthlyMortgagePayment * 12; // Total P+I for the year if loan active

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
        const actualAnnualMortgagePaid = (loanAmount > 0) ? (interestPaidThisYear + principalPaidThisYear) : 0;


        const propertyTaxPaidThisYear = currentHomeValue * propertyTaxRateDecimal;
        const homeInsurancePaidThisYear = currentHomeValue * homeInsuranceRateDecimal; // Assuming rate is % of current home value
        const maintenancePaidThisYear = monthlyMaintenance * 12;
        
        // totalHousingCostsThisYear based on actual mortgage payments made + other costs
        const totalHousingCostsThisYear = actualAnnualMortgagePaid + propertyTaxPaidThisYear + homeInsurancePaidThisYear + maintenancePaidThisYear;

        // Include ADU income in annual net income for buying scenario
        const annualNetIncome = (netMonthlyPay * 12) + additionalBonus + (aduMonthlyIncome * 12);
        const annualLivingExpenses = monthlyExpenses * 12; // General living expenses
        const savingsThisYear = annualNetIncome - totalHousingCostsThisYear - annualLivingExpenses;

        investedAssets += savingsThisYear;
        investedAssets *= (1 + spyReturnDecimal);

        if (year > 1 || homeAppreciationDecimal !== 0) { // No appreciation in year 1 if homeAppreciationDecimal is 0, but apply if not. More realistically, appreciation happens from day 1.
             currentHomeValue *= (1 + homeAppreciationDecimal);
        }


        // Factor in 6% selling cost for home equity calculation
        const homeEquity = (currentHomeValue * 0.94) - (remainingLoanBalance > 0 ? remainingLoanBalance : 0);
        const netWorth = homeEquity + investedAssets;

        const unrecoverableThisYear = interestPaidThisYear + propertyTaxPaidThisYear + homeInsurancePaidThisYear + maintenancePaidThisYear;
        totalUnrecoverableBuyCosts += unrecoverableThisYear;

        buyResults.push({
            year: year,
            homeValue: currentHomeValue,
            equity: homeEquity,
            remainingLoan: remainingLoanBalance > 0 ? remainingLoanBalance : 0,
            investedAssets: investedAssets,
            netWorth: netWorth,
            interestPaid: interestPaidThisYear,
            principalPaid: principalPaidThisYear,
            annualHousingCost: totalHousingCostsThisYear, // For more detailed analysis later
            savingsForYear: savingsThisYear,
            totalUnrecoverableCost: totalUnrecoverableBuyCosts // Add total unrecoverable cost
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
    const totalMonthlyHousingCostsBuy = monthlyMortgagePayment + monthlyPropertyTax + monthlyHomeInsurance + monthlyMaintenance;

    // Include ADU income in net monthly income for summary calculation
    const netMonthlyIncome = netMonthlyPay + (additionalBonus / 12) + aduMonthlyIncome;
    const savingsSurplusRenting = netMonthlyIncome - monthlyExpenses - monthlyRent - aduMonthlyIncome; // ADU income not available when renting
    const savingsSurplusBuying = netMonthlyIncome - monthlyExpenses - totalMonthlyHousingCostsBuy;


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
    addSummaryRow(tbody, 'Total Monthly Housing Costs (Buy):', totalMonthlyHousingCostsBuy, 'currency');

    addSectionHeader(tbody, 'Estimated Monthly Costs (Rent - Initial)');
    addSummaryRow(tbody, 'Monthly Rent:', monthlyRent, 'currency');

    addSectionHeader(tbody, 'Estimated Monthly Cash Flow (Initial)');
    addSummaryRow(tbody, 'Net Monthly Income:', netMonthlyIncome, 'currency');
    addSummaryRow(tbody, 'Monthly Non-Housing Expenses:', monthlyExpenses, 'currency');
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
    const headers = ['Year', 'Total Unrecoverable (Rent)', 'Total Unrecoverable (Buy)'];
    headers.forEach(text => {
        const th = document.createElement('th');
        th.textContent = text;
        headerRow.appendChild(th);
    });

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
    }
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
                    borderColor: 'rgba(255, 99, 132, 1)', // Reddish
                    backgroundColor: 'rgba(255, 99, 132, 0.2)',
                    tension: 0.1
                },
                {
                    label: 'Buying Net Worth',
                    data: netWorthBuyValues,
                    borderColor: 'rgba(54, 162, 235, 1)', // Bluish
                    backgroundColor: 'rgba(54, 162, 235, 0.2)',
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
                    borderColor: 'rgba(255, 159, 64, 1)', // Orangeish
                    backgroundColor: 'rgba(255, 159, 64, 0.2)',
                    tension: 0.1
                },
                {
                    label: 'Unrecoverable Costs (Buy)',
                    data: unrecoverableBuyValues,
                    borderColor: 'rgba(75, 192, 192, 1)', // greenish-blue
                    backgroundColor: 'rgba(75, 192, 192, 0.2)',
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
        });
    } else {
        console.error("Calculate button not found!");
    }
});
