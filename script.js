// script.js

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

        rentResults.push({
            year: year,
            rentPaidThisYear: currentAnnualRent,
            netWorth: investedAssets,
            savingsForYear: savingsThisYear // For detailed analysis
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
        additionalBonus
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

        const annualNetIncome = (netMonthlyPay * 12) + additionalBonus;
        const annualLivingExpenses = monthlyExpenses * 12; // General living expenses
        const savingsThisYear = annualNetIncome - totalHousingCostsThisYear - annualLivingExpenses;

        investedAssets += savingsThisYear;
        investedAssets *= (1 + spyReturnDecimal);

        if (year > 1 || homeAppreciationDecimal !== 0) { // No appreciation in year 1 if homeAppreciationDecimal is 0, but apply if not. More realistically, appreciation happens from day 1.
             currentHomeValue *= (1 + homeAppreciationDecimal);
        }


        const homeEquity = currentHomeValue - (remainingLoanBalance > 0 ? remainingLoanBalance : 0);
        const netWorth = homeEquity + investedAssets;

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
            savingsForYear: savingsThisYear
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

// Event Listener for the Calculate Button
document.addEventListener('DOMContentLoaded', () => {
    const calculateButton = document.getElementById('calculateButton');

    if (calculateButton) {
        calculateButton.addEventListener('click', () => {
            console.log("Calculate button clicked.");
            const userInputs = getInputs();
            const rentData = calculateRentingScenario(userInputs); // Updated variable name
            const buyData = calculateBuyingScenario(userInputs); // Still using stub
            displayResults(rentData, buyData);
        });
    } else {
        console.error("Calculate button not found!");
    }
});
