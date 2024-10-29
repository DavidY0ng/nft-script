export function processCSVData(data) {
	try {
		// console.log('Initial data:', data); // Debug log
		const result = [];
		let currentSection = [];
		let headers = null;

		// First, let's organize the data into sections
		data.forEach(row => {
			// Get non-empty columns
			const values = Object.values(row).filter(val => val);
			
			// If this is a header row (starts with "NFT #")
			if (values[0] === 'NFT #') {
				headers = row;
				if (currentSection.length > 0) {
					processSection(currentSection, result);
				}
				currentSection = [row];
			} else if (values.length > 0) {
				// Add non-empty rows to current section
				currentSection.push(row);
			}
		});

		// Process the last section
		if (currentSection.length > 0) {
			processSection(currentSection, result);
		}

		// console.log('Processed result:', result); // Debug log
		return result;
	} catch (e) {
		console.error('Processing error:', e);
		throw new Error('Failed to process CSV data: ' + e.message);
	}
}

export function processSection(section, result) {
	if (section.length < 2) return;

	const headers = section[0];
	const headerValues = Object.values(headers);
	const nftNumbers = headerValues.slice(1).filter(Boolean);

	// Process each NFT number
	nftNumbers.forEach((nftNumber, columnIndex) => {
		columnIndex++; // Adjust for header offset
		
		const attributes = [];
		// Process each trait row
		for (let i = 1; i < section.length; i++) {
			const row = section[i];
			const rowValues = Object.values(row);
			const traitType = rowValues[0];
			const traitValue = rowValues[columnIndex];

			if (traitValue && traitValue.toLowerCase() !== 'none' && traitType) {
				attributes.push({
					trait_type: traitType,
					value: traitValue
				});
			}
		}

		// Create NFT object
		const nftObject = {
			name: `RGZ #${nftNumber}`,
			image: `ipfs://xxxx/${nftNumber}.png`,
			attributes: attributes
		};

		// Add to result if not already present
		const exists = result.find(item => item.name === nftObject.name);
		if (!exists) {
			result.push(nftObject);
		}
	});
}