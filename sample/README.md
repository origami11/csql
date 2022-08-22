Список планет солнечной системы c их характеристиками
```
    csql "SELECT * FROM data"
```    

Названия планет солнечной системы
```
    csql "SELECT name FROM data"
```    

Сортировка планет по массе
```
    csql "SELECT name, mass AS m FROM data ORDER BY mass"
```    

Масса планет солнечной системы
```
    csql "SELECT SUM(mass) AS sum FROM data"
```

Планеты по количеству спутников в порядке возрастания
```
    csql "SELECT name, moons FROM data ORDER BY moons DESC"    
```