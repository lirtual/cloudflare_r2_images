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
  const imageUrl = decodeURIComponent(url.pathname.slice(1));
  
  if (!imageUrl.startsWith('http://') && !imageUrl.startsWith('https://')) {
    return new Response(JSON.stringify({ error: "Invalid image URL" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
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
    const fileName = imageUrl.split("/").pop();
    
    await env.BUCKET.put(fileName, arrayBuffer, {
      contentType: contentType,
    });
    
    const newImageUrl = `${url.origin}/image/${fileName}`;
    
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
