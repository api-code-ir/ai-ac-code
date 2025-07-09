<?php
// Note: This PHP handler is currently not strictly necessary for the basic functionality
// as the provided API can be called directly from JavaScript without exposing sensitive keys.
// However, it's good practice for APIs that require authentication or more complex server-side logic.
// We will keep it minimal for now.

header('Content-Type: application/json'); // Default response type

// Allow requests from any origin (for development).
// For production, restrict this to your frontend's domain.
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, GET, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    // Handle preflight request for CORS
    http_response_code(200);
    exit;
}

$API_BASE_URL = 'https://api2.api-code.ir/gpt-save-v2/';

function sendApiRequest($params, $files = []) {
    global $API_BASE_URL;
    $url = $API_BASE_URL;

    $postData = $params;

    // If files are present, it's a multipart/form-data request
    if (!empty($files)) {
        foreach ($files as $key => $file) {
            if (isset($file['tmp_name']) && is_uploaded_file($file['tmp_name'])) {
                 // For PHP, CurlFile is used to send files
                $cFile = new CURLFile($file['tmp_name'], $file['type'], $file['name']);
                $postData[$key] = $cFile;
            } else if (isset($file['path'])) { // For local file paths (e.g. if PHP generates/modifies a file first)
                $cFile = new CURLFile($file['path'], $file['type'] ?? mime_content_type($file['path']), $file['name'] ?? basename($file['path']));
                $postData[$key] = $cFile;
            }
        }
    } else if (isset($params['action']) && $params['action'] === 'generate_image') {
        // For image generation, parameters are sent as GET query string
        $url .= '?' . http_build_query($params);
        $postData = []; // No POST body for GET
    }


    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, $url);

    if ($_SERVER['REQUEST_METHOD'] === 'POST' && !empty($postData) && !(isset($params['action']) && $params['action'] === 'generate_image')) {
        curl_setopt($ch, CURLOPT_POST, 1);
        curl_setopt($ch, CURLOPT_POSTFIELDS, $postData); // This will be form-urlencoded if $postData is an array, or multipart if it contains CURLFile objects
    } else {
        // For GET requests (like image generation) or POSTs with no body (if that were a case)
        curl_setopt($ch, CURLOPT_HTTPGET, 1);
    }

    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    // curl_setopt($ch, CURLOPT_VERBOSE, true); // For debugging cURL requests
    // curl_setopt($ch, CURLOPT_STDERR, fopen('php://stderr', 'w')); // For debugging cURL requests

    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $curlError = curl_error($ch);
    curl_close($ch);

    if ($curlError) {
        http_response_code(500);
        echo json_encode(['error' => 'cURL Error: ' . $curlError]);
        exit;
    }

    if ($httpCode >= 400) {
        http_response_code($httpCode);
        // Try to return the API's error message if possible
        echo $response; // The API seems to return text/html on error, or sometimes plain text
        exit;
    }

    // For image generation, the response is the image data itself.
    if (isset($params['action']) && $params['action'] === 'generate_image') {
        // Determine content type (the API docs don't specify, so we guess or assume JPEG/PNG)
        // For simplicity, we let JS handle blob type detection. Here, we just pass it through.
        // header('Content-Type: image/jpeg'); // Or image/png, etc. This should ideally match the API's output.
        echo $response;
    } else {
        // For text responses, the API returns plain text.
        // We won't wrap it in JSON here as the JS expects plain text for chat.
        header('Content-Type: text/plain');
        echo $response;
    }
    exit;
}

// This PHP script is designed to be a proxy if needed.
// Currently, the JavaScript directly calls the API.
// If you want to use this PHP script as a proxy, you would:
// 1. Change the API_URL in script.js to point to this handler.php.
// 2. This script would then receive requests, forward them to the actual API, and return the response.

// Example of how you might structure if JS called this script:
/*
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $params = $_POST;
    $files = $_FILES;
    sendApiRequest($params, $files);
} elseif ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $params = $_GET;
    sendApiRequest($params);
} else {
    http_response_code(405); // Method Not Allowed
    echo json_encode(['error' => 'Method Not Allowed']);
}
*/

// Since the JS is calling the API directly, this PHP file is not actively used in the current setup
// but is here as a placeholder or for future extension (e.g., if API keys were needed).
// For now, it doesn't do anything unless called directly.
// If you were to call it directly (e.g. from Postman or another script):
// php_handler.php?userid=test&prompt=hello  (for text chat)
// php_handler.php?action=generate_image&prompt=cat (for image generation)

// To make it functional as a proxy, you would uncomment the section above
// and change the `API_URL` in `script.js` to something like `'api/handler.php'`.
// For now, we'll leave it as is, as the JS is self-sufficient for this particular API.

if (php_sapi_name() == 'cli-server' && $_SERVER['REQUEST_URI'] == '/') {
    // Serve a simple message if accessed directly in a dev server
    echo "PHP API Handler is active. It's intended to be called by the frontend JavaScript or as an API endpoint.";
}
?>
