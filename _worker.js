import { sha256 } from './utils/hash';

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    
    // Handle image requests
    if (url.pathname.startsWith('/image/')) {
      return handleImageRequest(request, env);
    }
    
    // Handle proxy requests
    return handleProxyRequest(request, env);
  }
};

async function handleImageRequest(request, env) {
  const url = new URL(request.url);
  const fileName = url.pathname.split('/').pop();
  
  try {
    const object = await env.BUCKET.get(fileName);
    if (object === null) {
      return new Response("Image not found", { status: 404 });
    }
    
    const headers = new Headers();
    object.writeHttpMetadata(headers);
    headers.set("etag", object.httpEtag);
    
    return new Response(object.body, { headers });
  } catch (error) {
    console.error("Error retrieving image:", error);
    return new Response("Server error", { status: 500 });
  }
}

async function handleProxyRequest(request, env) {
  const url = new URL(request.url);
  let imageUrl = decodeURIComponent(url.pathname.slice(1));
  
  // Check if the protocol is included, if not, add 'https://'
  if (!imageUrl.startsWith('http://') && !imageUrl.startsWith('https://')) {
    imageUrl = 'https://' + imageUrl;
  }
  
  try {
    const response = await fetch(imageUrl);
    if (!response.ok) {
      throw new Error("Unable to fetch image");
    }
    
    const contentType = response.headers.get("Content-Type");
    if (!contentType || !contentType.startsWith("image/")) {
      throw new Error("Not a valid image");
    }
    
    const arrayBuffer = await response.arrayBuffer();
    
    // Calculate hash of file content
    const hashHex = await sha256(arrayBuffer);
    
    // Generate unique filename
    const originalFileName = imageUrl.split("/").pop();
    const fileExtension = originalFileName.split('.').pop();
    const uniqueFileName = `${hashHex}.${fileExtension}`;
    
    // Check if the file already exists in R2
    const existingObject = await env.BUCKET.head(uniqueFileName);
    
    if (!existingObject) {
      // If the file doesn't exist, save it to R2
      await env.BUCKET.put(uniqueFileName, arrayBuffer, {
        contentType: contentType,
      });
    }
    
    const newImageUrl = `${url.origin}/image/${uniqueFileName}`;
    
    return new Response(JSON.stringify({ url: newImageUrl }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error handling proxy request:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
