import { useState } from 'react'
import Tiptap from './Tiptap'
import Text from './Text';
const TextEditor = () => {
    const [htmlContent, setHtmlContent] = useState('')
   const handleEditorContentSave = (html) => {
        console.log(html);
        setHtmlContent(html);
        // Save the HTML content to your server or state
    };
  return (
        <div>
            <Tiptap onEditorContentSave={handleEditorContentSave} />
            <hr/>
            <Text content={htmlContent}/>
        </div>
  )
}

export default TextEditor
