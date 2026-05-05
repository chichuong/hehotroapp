from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
import os
import json
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.models.property import Property

router = APIRouter()

class ChatRequest(BaseModel):
    message: str

class ChatResponse(BaseModel):
    reply: str
    properties: list[dict] = []

@router.post("/chat", response_model=ChatResponse)
def chat_with_ai(request: ChatRequest, db: Session = Depends(get_db)):
    try:
        import google.generativeai as genai
    except ImportError:
        return {"reply": "Hệ thống đang thiếu thư viện google-generativeai. Vui lòng dừng backend và chạy: pip install google-generativeai", "properties": []}
    try:
        from dotenv import load_dotenv
        load_dotenv(override=True)
    except Exception:
        pass
        
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        return {"reply": "Bạn ơi, vui lòng cấu hình GEMINI_API_KEY vào file backend/.env để tôi có thể suy nghĩ nhé!", "properties": []}
    
    genai.configure(api_key=api_key)
    try:
        model = genai.GenerativeModel('gemini-1.5-flash')
    except Exception as e:
        return {"reply": f"Lỗi khởi tạo AI: {str(e)}", "properties": []}
    
    # 1. Trích xuất thông tin
    extraction_prompt = f"""
    Bạn là một trợ lý bất động sản. Trích xuất các tiêu chí tìm kiếm từ câu sau của khách.
    Câu của khách: "{request.message}"
    Trả về ĐÚNG 1 chuỗi JSON hợp lệ với cấu trúc sau, KHÔNG có markdown (không dùng ```json):
    {{
        "min_price": (số nguyên, không có trả null),
        "max_price": (số nguyên, không có trả null),
        "rooms": (số nguyên, số phòng ngủ, không có trả null),
        "suburb": (tên khu vực, không có trả null)
    }}
    Lưu ý: Khách có thể nói theo tiền Việt (ví dụ 1 triệu = 1000000). Trả về JSON thuần tuý.
    """
    
    try:
        extract_response = model.generate_content(extraction_prompt)
        text = extract_response.text.strip()
        if text.startswith("```json"):
            text = text[7:-3].strip()
        elif text.startswith("```"):
            text = text[3:-3].strip()
        criteria = json.loads(text)
    except Exception as e:
        print("Error parsing JSON:", e)
        criteria = {}

    # 2. Tìm kiếm trong Database
    query = db.query(Property)
    if criteria.get("rooms"):
        query = query.filter(Property.rooms >= criteria["rooms"])
    if criteria.get("max_price"):
        query = query.filter(Property.price <= criteria["max_price"])
    if criteria.get("min_price"):
        query = query.filter(Property.price >= criteria["min_price"])
    if criteria.get("suburb"):
        query = query.filter(Property.suburb.ilike(f"%{criteria['suburb']}%"))
        
    properties = query.limit(4).all()
    
    prop_data = []
    for p in properties:
        prop_data.append({
            "id": p.id,
            "title": p.title,
            "price": p.price,
            "suburb": p.suburb,
            "rooms": p.rooms,
            "bathrooms": p.bathrooms,
            "cars": p.cars,
            "image_url": p.images[0].image_url if p.images else "https://placehold.co/400x300?text=No+Image"
        })

    # 3. Trả lời tự nhiên
    prop_str = json.dumps(prop_data, ensure_ascii=False)
    reply_prompt = f"""
    Bạn là một môi giới bất động sản chuyên nghiệp và thân thiện.
    Khách hàng vừa nói: "{request.message}"
    Hệ thống đã tìm được các căn nhà sau trong Database: {prop_str}
    
    Hãy viết một câu trả lời ngắn gọn, thân thiện (bằng tiếng Việt) để tư vấn cho khách.
    Nếu tìm thấy nhà, hãy giới thiệu tóm tắt lý do tại sao chúng phù hợp. Không liệt kê chi tiết vì giao diện đã hiện thẻ nhà.
    Nếu không tìm thấy (mảng rỗng), hãy xin lỗi và gợi ý khách đổi tiêu chí.
    """
    
    try:
        reply_response = model.generate_content(reply_prompt)
        final_reply = reply_response.text
    except Exception as e:
        final_reply = "Tôi đã tìm thấy vài kết quả bên dưới, bạn tham khảo nhé!"
    
    return {
        "reply": final_reply,
        "properties": prop_data
    }
