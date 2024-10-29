<script>
	import Papa from 'papaparse';
	import JSZip from 'jszip';
	import * as XLSX from 'xlsx';
	import { processCSVData } from './process';
	import { validateData } from './validation';

	let loading = false;
	let result = null;
	let error = null;
	let validationStats = null;
	let originalData = null;

	async function handleFileUpload(event) {
        const file = event.target.files[0];
        if (!file) return;

        loading = true;
        error = null;
        result = null;
        validationStats = null;

        try {
            const fileExtension = file.name.split('.').pop().toLowerCase();
            let data;
            
            if (fileExtension === 'csv') {
                // Handle CSV
                const text = await file.text();
                const parseResult = Papa.parse(text, { header: false });
                data = parseResult.data;
            } else if (['xlsx', 'xls'].includes(fileExtension)) {
                // Handle Excel
                const arrayBuffer = await file.arrayBuffer();
                const workbook = XLSX.read(arrayBuffer);
                const worksheet = workbook.Sheets[workbook.SheetNames[0]];
                data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
            } else {
                throw new Error('Unsupported file format');
            }

            originalData = data;
            const processedData = data.map(row => {
                const obj = {};
                row.forEach((value, index) => {
                    obj[index] = value?.toString() || '';
                });
                return obj;
            });

            result = processCSVData(processedData);
            validationStats = validateData(result, data);

        } catch (e) {
            console.error('Error:', e);
            error = e.message;
        } finally {
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

	{#if validationStats}
	<div class="mt-4 p-4 bg-gray-50 rounded border">
		<h3 class="text-lg font-semibold mb-3">Validation Results:</h3>
		
		<div class="space-y-2">
			<div class="flex justify-between">
				<span>Total NFTs Processed:</span>
				<span class="font-medium">{validationStats.totalNFTs}</span>
			</div>
			
			<div class="flex justify-between">
				<span>NFT Numbers Matched:</span>
				<span class="font-medium {validationStats.nftNumbersMatched === validationStats.totalNFTs ? 'text-green-600' : 'text-red-600'}">
					{validationStats.nftNumbersMatched} / {validationStats.totalNFTs}
				</span>
			</div>

			<div>
				<span class="font-medium">Attribute Distribution:</span>
				<ul class="ml-4">
					{#each Object.entries(validationStats.attributeCounts) as [count, number]}
						<li>{number} NFTs have {count} attributes</li>
					{/each}
				</ul>
			</div>

			{#if validationStats.missingAttributes.length > 0}
				<div class="text-red-600">
					<span class="font-medium">Missing Attributes:</span>
					<ul class="ml-4">
						{#each validationStats.missingAttributes as attr}
							<li>{attr}</li>
						{/each}
					</ul>
				</div>
			{/if}

			{#if validationStats.extraAttributes.length > 0}
				<div class="text-orange-600">
					<span class="font-medium">Extra Attributes:</span>
					<ul class="ml-4">
						{#each validationStats.extraAttributes as attr}
							<li>{attr}</li>
						{/each}
					</ul>
				</div>
			{/if}

			{#if validationStats.potentialIssues.length > 0}
				<div class="text-red-600">
					<span class="font-medium">Potential Issues:</span>
					<ul class="ml-4">
						{#each validationStats.potentialIssues as issue}
							<li>{issue}</li>
						{/each}
					</ul>
				</div>
			{/if}
		</div>
	</div>
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
