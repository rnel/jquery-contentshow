cd dist

git init

git config user.name "Arnel Aguinaldo (Travis CI)"
git config user.email "aguinaldoarnel@gmail.com"

git add .
git commit -m "Deploy to GitHub Pages"

git push --force --quiet "https://${GH_TOKEN}@${GH_REF}" master:gh-pages > /dev/null 2>&1