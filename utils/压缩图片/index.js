// 用于在 Input 标签中获取图片文件
function readImg(file) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        const reader = new FileReader();

        reader.onload = e => {
            img.src = e.target.result;
        };

        reader.onerror = e => reject(e);

        reader.readAsDataURL(file);
        img.onload = () => resolve(img);

        img.onerror = e => reject(e);
    })
}

/**
 * 压缩图片
 * @param img 被压缩的img对象
 * @param type 压缩后转换的文件类型
 * @param mw 触发压缩的图片最大宽度限制
 * @param mh 触发压缩的图片最大高度限制
 * @param quality 图片质量 一般在 0.2 达到最大压缩效果
 */
function compressImg(img, type, mw, mh, quality) {
    return new Promise((resolve, reject) => {
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        const { width: originalWidth, height: originalHeight } = img;

        // 最大尺寸限制
        const maxWidth = mw;
        const maxHeight = mh;

        // 目标尺寸
        let targetWidth = originalWidth;
        let targetHeight = originalHeight;

        if (originalWidth > maxWidth || originalHeight > maxHeight) {
            if (originalWidth / originalHeight > 1) {
                // 宽图片
                targetWidth = maxWidth;
                targetHeight = Math.round(maxWidth * (originalHeight / originalWidth));
            } else {
                // 长图片
                targetHeight = maxHeight;
                targetWidth = Math.round(maxHeight * (originalWidth / originalHeight));
            }
        }

        canvas.width = targetWidth;
        canvas.height = targetHeight;
        context?.clearRect(0, 0, targetWidth, targetHeight);

        // 图片绘制
        context?.drawImage(img, 0, 0, targetWidth, targetHeight);
        canvas.toBlob(blob => {
            resolve(blob);
        }, type || 'image/png', quality);
    });
}