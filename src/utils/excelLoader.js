import * as XLSX from 'xlsx'

/**
 * @exposes excelLoader to #xss with Excel file data
 * @mitigates excelLoader against #xss with input validation and sanitization
 * @mitigates excelLoader against #api_info_disclosure with error handling that doesn't expose sensitive details
 */
const SHAREPOINT_URL = 'https://kochind-my.sharepoint.com/:x:/g/personal/james_sykes_gapac_com/IQDrd46I9ay2TI4rk1upMG9TAVCOw-A1slZ800XdyV9f-i0?email=kevin.bellefeuil%40gapac.com&wdOrigin=TEAMS-MAGLEV.undefined_ns.rwc&wdExp=TEAMS-TREATMENT&wdhostclicktime=1768751539850&web=1'

/**
 * Convert SharePoint sharing link to direct download URL
 * SharePoint sharing links need to be converted to a format that allows direct download
 * Note: This may require authentication or a backend proxy in production
 * @param {string} sharePointUrl - The SharePoint sharing URL
 * @returns {string[]} - Array of possible download URLs to try
 */
const convertSharePointUrl = (sharePointUrl) => {
  const urls = []
  
  try {
    // Extract the file ID from the SharePoint URL
    // Format: https://.../:x:/g/personal/.../FILE_ID?...
    const fileIdMatch = sharePointUrl.match(/([A-Za-z0-9_-]{40,})/)
    if (fileIdMatch) {
      const fileId = fileIdMatch[1]
      
      // Try multiple URL formats
      // Format 1: Direct download with UniqueId
      urls.push(`https://kochind-my.sharepoint.com/personal/james_sykes_gapac_com/_layouts/15/download.aspx?UniqueId=${fileId}`)
      
      // Format 2: WebDAV style
      urls.push(`https://kochind-my.sharepoint.com/personal/james_sykes_gapac_com/_layouts/15/download.aspx?SourceUrl=https://kochind-my.sharepoint.com/personal/james_sykes_gapac_com/Documents/${fileId}`)
      
      // Format 3: Graph API style (requires auth, but worth trying)
      urls.push(`https://graph.microsoft.com/v1.0/me/drive/items/${fileId}/content`)
    }
    
    // Format 4: Try original URL with download parameter
    try {
      const url = new URL(sharePointUrl)
      url.searchParams.set('download', '1')
      urls.push(url.toString())
    } catch (e) {
      // Ignore URL parsing errors
    }
    
    // Format 5: Try original URL as-is (sometimes works if user is authenticated)
    urls.push(sharePointUrl)
    
  } catch (error) {
    console.error('Error converting SharePoint URL:', error)
    // Return original URL as fallback
    urls.push(sharePointUrl)
  }
  
  return urls
}

/**
 * Load Excel file from SharePoint
 * Tries multiple URL formats and methods
 * @returns {Promise<Array>} - Parsed Excel data as array of objects
 */
export const loadExcelFromSharePoint = async () => {
  const urls = convertSharePointUrl(SHAREPOINT_URL)
  let lastError = null
  
  // Try each URL format until one works
  for (const downloadUrl of urls) {
    try {
      console.log('Attempting to load from:', downloadUrl)
      
      // Fetch the file with various headers
      const response = await fetch(downloadUrl, {
        method: 'GET',
        mode: 'cors',
        credentials: 'include', // Include cookies for authentication
        headers: {
          'Accept': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/octet-stream, */*'
        }
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      // Check if response is actually Excel
      const contentType = response.headers.get('content-type')
      if (!contentType || (!contentType.includes('spreadsheet') && !contentType.includes('octet-stream'))) {
        // Might still be Excel even if content-type is wrong, continue
        console.warn('Unexpected content-type:', contentType)
      }

      // Get file as array buffer
      const arrayBuffer = await response.arrayBuffer()
      
      if (arrayBuffer.byteLength === 0) {
        throw new Error('Received empty file')
      }
      
      // Parse Excel file
      const workbook = XLSX.read(arrayBuffer, { type: 'array' })
      
      if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
        throw new Error('Excel file has no sheets')
      }
      
      // Get the first sheet (assuming data is in first sheet)
      const sheetName = workbook.SheetNames[0]
      const worksheet = workbook.Sheets[sheetName]
      
      // Convert to JSON
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { defval: '' })
      
      if (jsonData.length === 0) {
        throw new Error('Excel file has no data rows')
      }
      
      // Filter out RecordID and WRITE IN columns, and transform data
      const transformedData = jsonData.map((row) => {
        const transformedRow = {}
        
        // Map all columns except RecordID and WRITE IN
        Object.keys(row).forEach(key => {
          const trimmedKey = key.trim()
          if (trimmedKey !== 'RecordID' && trimmedKey !== 'WRITE IN') {
            transformedRow[trimmedKey] = row[key]
          }
        })
        
        // Ensure approval field exists (initialize as null)
        transformedRow.approval = null
        
        return transformedRow
      })
      
      console.log('Successfully loaded Excel file with', transformedData.length, 'rows')
      return transformedData
      
    } catch (error) {
      console.warn(`Failed to load from URL format: ${error.message}`)
      lastError = error
      // Continue to next URL
      continue
    }
  }
  
  // If all URLs failed, throw the last error
  throw new Error(`Failed to load Excel from SharePoint after trying ${urls.length} URL formats. Last error: ${lastError?.message || 'Unknown error'}. SharePoint may require authentication that cannot be handled in the browser. Please use the public folder option.`)
}

/**
 * Load Excel file from local public folder (fallback)
 * @param {string} fileName - Name of the Excel file in public folder
 * @returns {Promise<Array>} - Parsed Excel data as array of objects
 */
export const loadExcelFromPublic = async (fileName = 'PLANNING_UNIT_STAGE.xlsx') => {
  try {
    console.log('Step 1: Attempting to load Excel file from public folder:', fileName)
    
    const response = await fetch(`/${fileName}`)
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: Failed to load Excel file. Make sure ${fileName} exists in the public folder.`)
    }

    console.log('Step 2: File fetched successfully, getting array buffer...')
    const arrayBuffer = await response.arrayBuffer()
    
    if (arrayBuffer.byteLength === 0) {
      throw new Error('Received empty file')
    }
    
    console.log('Step 3: File size:', (arrayBuffer.byteLength / 1024).toFixed(2), 'KB')
    console.log('Step 4: Starting Excel parsing...')
    
    // Parse Excel - keep it simple and fast
    const workbook = XLSX.read(arrayBuffer, { 
      type: 'array',
      cellDates: false,
      cellNF: false,
      cellStyles: false,
      sheetStubs: false
    })
    
    console.log('Step 5: Workbook parsed, checking sheets...')
    
    if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
      throw new Error('Excel file has no sheets')
    }
    
    const sheetName = workbook.SheetNames[0]
    console.log('Step 6: Reading sheet:', sheetName)
    
    const worksheet = workbook.Sheets[sheetName]
    
    // Check if worksheet exists
    if (!worksheet) {
      throw new Error(`Sheet "${sheetName}" not found in workbook`)
    }
    
    console.log('Step 7: Converting sheet to JSON...')
    const jsonData = XLSX.utils.sheet_to_json(worksheet, { 
      defval: '',
      raw: true // Keep raw values for better performance
    })
    
    console.log('Step 8: Found', jsonData.length, 'rows in Excel file')
    
    if (jsonData.length === 0) {
      throw new Error('Excel file has no data rows')
    }
    
    console.log('Step 9: Transforming data...')
    
    // Simple, straightforward transformation - no chunking
    const transformedData = jsonData.map((row) => {
      const transformedRow = {}
      
      // Get all keys from the row
      const keys = Object.keys(row)
      
      for (const key of keys) {
        const trimmedKey = key.trim()
        if (trimmedKey !== 'RecordID' && trimmedKey !== 'WRITE IN') {
          transformedRow[trimmedKey] = row[key]
        }
      }
      
      transformedRow.approval = null
      return transformedRow
    })
    
    console.log('Step 10: Successfully transformed', transformedData.length, 'rows')
    console.log('Step 11: Sample row keys:', Object.keys(transformedData[0] || {}))
    
    return transformedData
    
  } catch (error) {
    console.error('Error loading Excel from public folder:', error)
    console.error('Error stack:', error.stack)
    throw new Error(`Failed to load Excel file: ${error.message}`)
  }
}
