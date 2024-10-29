<script>
    import Papa from 'papaparse';
	import JSZip from 'jszip';
	import * as XLSX from 'xlsx';
    
    let loading = false;
    let result = null;
    let error = null;

    function processCSVData(data) {
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

    function processSection(section, result) {
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

	async function downloadAsZip(nfts) {
        const zip = new JSZip();
        
        nfts.forEach(nft => {
            const filename = `${nft.name.replace('RGZ #', '')}.json`;
            const content = JSON.stringify(nft, null, 2);
            zip.file(filename, content);
        });
        
        const blob = await zip.generateAsync({ type: 'blob' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'nft-files.zip';
        a.click();
        window.URL.revokeObjectURL(url);
    }

    function downloadAsSingleJson(nfts) {
        const blob = new Blob([JSON.stringify(nfts, null, 2)], { type: 'application/json' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'all-nfts.json';
        a.click();
        window.URL.revokeObjectURL(url);
    }

	async function handleFileUpload(event) {
        const file = event.target.files[0];
        if (!file) return;

        loading = true;
        error = null;
        result = null;

        try {
            const fileExtension = file.name.split('.').pop().toLowerCase();
            
            if (fileExtension === 'csv') {
                // Handle CSV
                Papa.parse(file, {
                    header: false,
                    skipEmptyLines: true,
                    complete: (results) => {
                        try {
                            const processedData = results.data.map(row => {
                                const obj = {};
                                row.forEach((value, index) => {
                                    obj[index] = value;
                                });
                                return obj;
                            });
                            result = processCSVData(processedData);
                        } catch (e) {
                            error = e.message;
                        } finally {
                            loading = false;
                        }
                    },
                    error: (err) => {
                        error = err.message;
                        loading = false;
                    }
                });
            } else if (['xlsx', 'xls'].includes(fileExtension)) {
                // Handle Excel
                const arrayBuffer = await file.arrayBuffer();
                const workbook = XLSX.read(arrayBuffer);
                const worksheet = workbook.Sheets[workbook.SheetNames[0]];
                const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
                
                // Convert Excel data to match CSV format
                const processedData = data.map(row => {
                    const obj = {};
                    row.forEach((value, index) => {
                        obj[index] = value?.toString() || ''; // Convert to string and handle null/undefined
                    });
                    return obj;
                });

                result = processCSVData(processedData);
            } else {
                throw new Error('Unsupported file format. Please upload a CSV or Excel file.');
            }
        } catch (e) {
            console.error('Error processing file:', e);
            error = e.message;
            loading = false;
        }
    }

    function downloadJSON(data, filename) {
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        window.URL.revokeObjectURL(url);
    }

    function downloadSingleNFT(nftData) {
        const filename = `${nftData.name.replace('RGZ #', '')}.json`;
        downloadJSON(nftData, filename);
    }
</script>

<div class="max-w-xl mx-auto p-4">
    <h1 class="text-2xl font-bold mb-4">NFT CSV to JSON Converter</h1>
    
    <div class="mb-4">
        <input
            type="file"
            accept=".csv"
            on:change={handleFileUpload}
            class="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
        />
    </div>

    {#if loading}
        <p class="text-gray-600">Processing...</p>
    {/if}

    {#if error}
        <p class="text-red-500">Error: {error}</p>
    {/if}

    {#if result && result.length > 0}
        <div class="mt-4">
            <div class="flex flex-col gap-4">
                <div class="flex justify-between items-center">
                    <h2 class="text-lg font-semibold">Preview: ({result.length} NFTs processed)</h2>
                    <div class="flex gap-2">
                        <button 
                            on:click={() => downloadAsSingleJson(result)}
                            class="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
                        >
                            Download Single JSON
                        </button>
                        <button 
                            on:click={() => downloadAsZip(result)}
                            class="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 transition-colors"
                        >
                            Download Separate Files (ZIP)
                        </button>
                    </div>
                </div>
                
                <div class="space-y-4">
                    {#each result as nft}
                        <div class="bg-gray-100 p-4 rounded">
							<div class="flex justify-between">
								<h3 class="font-medium">{nft.name}</h3>
								<button 
									on:click={() => downloadSingleNFT(nft)}
									class="text-blue-500 hover:text-blue-600"
								>
									Download
								</button>
							</div>
                            <pre class="mt-2 overflow-x-auto text-sm">
                                {JSON.stringify(nft, null, 2)}
                            </pre>
                        </div>
                    {/each}
                </div>
            </div>
        </div>
    {/if}
</div>