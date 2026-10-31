# index.html 의 css/js 주소 뒤에 ?v=버전 을 붙여서 브라우저가 옛 파일을 쓰지 않게 함
import re, sys, io
V = sys.argv[1]
p = "index.html"
t = io.open(p, encoding="utf-8").read()
t2 = re.sub(r'(href="styles\.css|src="js/[\w-]+\.js)(\?v=[\w-]+)?"', lambda m: m.group(1) + "?v=" + V + '"', t)
io.open(p, "w", encoding="utf-8").write(t2)
print(len(re.findall(r"\?v=" + V, t2)), "tags")
