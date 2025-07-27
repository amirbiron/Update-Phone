const { generateRecommendation } = require('./recommendationEngine');

const deviceData = [
    { name: "iPhone 15 Pro", manufacturer: "Apple", model: "15 Pro", releaseYear: 2023, os: "iOS" },
    { name: "Samsung Galaxy S24 Ultra", manufacturer: "Samsung", model: "S24 Ultra", releaseYear: 2024, os: "Android" },
    { name: "Google Pixel 8 Pro", manufacturer: "Google", model: "Pixel 8 Pro", releaseYear: 2023, os: "Android" },
    { name: "iPhone 13", manufacturer: "Apple", model: "13", releaseYear: 2021, os: "iOS" },
    { name: "Samsung Galaxy A54", manufacturer: "Samsung", model: "A54", releaseYear: 2023, os: "Android" },
    { name: "iPhone 11", manufacturer: "Apple", model: "11", releaseYear: 2019, os: "iOS" }
];

function getDeviceDetails(modelName) {
    const lowerCaseModelName = modelName.toLowerCase();
    const device = deviceData.find(d => d.name.toLowerCase() === lowerCaseModelName);
    if (device) {
        return {
            ...device,
            recommendation: generateRecommendation(device.releaseYear)
        };
    }
    return null;
}

function getSupportedModels() {
    return deviceData.map(d => d.name);
}

module.exports = {
    getDeviceDetails,
    getSupportedModels
};
