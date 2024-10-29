<script>
	import Papa from 'papaparse';
	import JSZip from 'jszip';
	import * as XLSX from 'xlsx';
	import { processCSVData } from './process';

	let loading = false;
	let result = null;
	let error = null;

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
							const processedData = results.data.map((row) => {
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
				const processedData = data.map((row) => {
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

	async function downloadAsZip(nfts) {
		const zip = new JSZip();

		nfts.forEach((nft) => {
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

<div class="mx-auto max-w-xl p-4">
	<h1 class="mb-4 text-2xl font-bold">NFT CSV to JSON Converter</h1>

	<div class="mb-4">
		<input
			type="file"
			accept=".csv"
			on:change={handleFileUpload}
			class="block w-full text-sm text-gray-500 file:mr-4 file:rounded-full file:border-0 file:bg-blue-50 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-blue-700 hover:file:bg-blue-100"
		/>
	</div>

	{#if error}
		<p class="text-red-500">Error: {error}</p>
	{/if}

	{#if result && result.length > 0}
		<div class="mt-4">
			<div class="flex flex-col gap-4">
				<div class="flex items-center justify-between">
					<h2 class="text-lg font-semibold">Preview: ({result.length} NFTs processed)</h2>
					<div class="flex gap-2">
						<button
							on:click={() => downloadAsSingleJson(result)}
							class="rounded bg-blue-500 px-4 py-2 text-white transition-colors hover:bg-blue-600"
						>
							Download Single JSON
						</button>
						<button
							on:click={() => downloadAsZip(result)}
							class="rounded bg-green-500 px-4 py-2 text-white transition-colors hover:bg-green-600"
						>
							Download Separate Files (ZIP)
						</button>
					</div>
				</div>

				<div class="space-y-4">
					{#each result as nft}
						<div class="rounded bg-gray-100 p-4">
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
