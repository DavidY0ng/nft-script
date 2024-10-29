export function validateData(processedNFTs, originalRows) {
	const stats = {
		totalNFTs: processedNFTs.length,
		totalOriginalRows: originalRows.filter(row => row[0] === 'NFT #').length,
		nftNumbersMatched: 0,
		attributeCounts: {},
		missingAttributes: [],
		extraAttributes: [],
		potentialIssues: []
	};

	// Get all NFT numbers from original data
	const originalNFTNumbers = new Set();
	let currentNFTNumbers = [];
	originalRows.forEach(row => {
		if (row[0] === 'NFT #') {
			Object.values(row).slice(1).forEach(num => {
				if (num && num.toString().trim()) {
					originalNFTNumbers.add(num.toString().trim());
					currentNFTNumbers.push(num.toString().trim());
				}
			});
		}
	});

	// Check NFT numbers match
	processedNFTs.forEach(nft => {
		const nftNumber = nft.name.replace('RGZ #', '');
		if (originalNFTNumbers.has(nftNumber)) {
			stats.nftNumbersMatched++;
		} else {
			stats.potentialIssues.push(`NFT #${nftNumber} in output but not in original data`);
		}
	});

	// Check for missing NFT numbers
	originalNFTNumbers.forEach(num => {
		if (!processedNFTs.some(nft => nft.name === `RGZ #${num}`)) {
			stats.potentialIssues.push(`NFT #${num} in original data but not in output`);
		}
	});

	// Count attributes per NFT
	processedNFTs.forEach(nft => {
		const count = nft.attributes.length;
		stats.attributeCounts[count] = (stats.attributeCounts[count] || 0) + 1;
	});

	// Check for consistency in attribute types
	const allAttributeTypes = new Set();
	processedNFTs.forEach(nft => {
		nft.attributes.forEach(attr => {
			allAttributeTypes.add(attr.trait_type);
		});
	});

	// Compare with expected attribute types from original data
	const expectedAttributes = new Set();
	originalRows.forEach(row => {
		if (row[0] && row[0] !== 'NFT #' && !row[0].startsWith(',')) {
			expectedAttributes.add(row[0]);
		}
	});

	// Find missing and extra attributes
	expectedAttributes.forEach(attr => {
		if (!allAttributeTypes.has(attr)) {
			stats.missingAttributes.push(attr);
		}
	});

	allAttributeTypes.forEach(attr => {
		if (!expectedAttributes.has(attr)) {
			stats.extraAttributes.push(attr);
		}
	});

	return stats;
}
