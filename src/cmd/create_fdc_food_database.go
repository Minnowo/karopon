package cmd

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"karopon/src/database"
	"karopon/src/database/connection"
	"os"

	"github.com/rs/zerolog/log"
	"github.com/urfave/cli/v3"
)

const (
	FAT int = iota
	CARB
	FIBRE
	PROTEIN
)

type tNutrient struct {
	Type     string `json:"type"`
	Nutrient struct {
		Name string `json:"name"`
		Unit string `json:"unitName"`
	} `json:"nutrient"`
	MaxValue float32 `json:"max"`
	MinValue float32 `json:"min"`
	MidValue float32 `json:"median"`
	Value    float32 `json:"amount"`
}
type tNutrientConv struct {
	// We only care about the .CalorieConversionFactor
	Type    string  `json:"type"`
	Protein float32 `json:"proteinValue"`
	Fat     float32 `json:"fatValue"`
	Carbs   float32 `json:"carbohydrateValue"`
}

type tFood struct {
	FoodClass          string          `json:"foodClass"`
	Name               string          `json:"description"`
	PublicationDate    string          `json:"publicationDate"`
	FDCID              int             `json:"fdcid"`
	NDBID              int             `json:"ndbNumber"`
	Nutrients          []tNutrient     `json:"foodNutrients"`
	NutrientConversion []tNutrientConv `json:"nutrientConversionFactors"`
}

func CmdCreateFDC(ctx context.Context, c *cli.Command) error {

	dbconn := c.Value("database-conn").(string)
	name := c.Value("name").(string)
	url := c.Value("url").(string)
	note := c.Value("note").(string)
	fdcJson := c.Value("fdc-dataset").(string)
	ignoreErrors := c.Value("ignore-errors").(bool)

	conn, err := connection.Connect(context.Background(), database.POSTGRES, dbconn)

	if err != nil {
		return err
	}

	ctx = context.Background()

	if err := conn.Migrate(ctx); err != nil {
		return err
	}

	file, err := os.Open(fdcJson)

	if err != nil {
		return err
	}

	var datasource database.TblDataSource

	if err := conn.LoadDataSourceByName(ctx, name, &datasource); err != nil {

		if err != sql.ErrNoRows {
			return err
		}

		datasource.Name = name
		datasource.Url = url
		datasource.Notes = note

		if id, err := conn.AddDataSource(ctx, &datasource); err != nil {
			return err
		} else {
			datasource.ID = id
		}
	}

	log.Info().Msg("Importing food, please wait...")

	defer file.Close()

	dec := json.NewDecoder(file)

	if tok, err := dec.Token(); err != nil {
		return err
	} else if d, ok := tok.(json.Delim); !ok || d != '{' {
		return fmt.Errorf("expected { token")
	}

	if tok, err := dec.Token(); err != nil {
		return err
	} else if d, ok := tok.(string); !ok || (d != "FoundationFoods" && d != "BrandedFoods" && d != "SRLegacyFoods" && d != "SurveyFoods") {
		return fmt.Errorf("Could not find the expected JSON key for the FDC food exports. Either the database export is a newer format we don't support yet, or is invalid.")
	}

	if tok, err := dec.Token(); err != nil {
		return err
	} else if d, ok := tok.(json.Delim); !ok || d != '[' {
		return fmt.Errorf("expected [ token")
	}

	nutrientsColumnMapping := map[string]int{

		"Carbohydrate, by summation":  CARB,
		"Carbohydrate, by difference": CARB,

		"Protein":           PROTEIN,
		"Total lipid (fat)": FAT,

		"Fiber, total dietary":               FIBRE,
		"Total dietary fiber (AOAC 2011.25)": FIBRE,

		// TODO: other mappings later
		// "Iron, Fe": IRON,
	}

	for dec.More() {

		var food tFood

		if err := dec.Decode(&food); err != nil {
			return err
		}

		var insertFood database.TblDataSourceFood

		insertFood.DataSourceID = datasource.ID
		insertFood.Name = food.Name

		// always per 100 grams
		insertFood.Unit = "g"
		insertFood.Portion = 100
		insertFood.DataSourceRowID = food.FDCID

		for _, n := range food.Nutrients {
			if mapping, ok := nutrientsColumnMapping[n.Nutrient.Name]; ok {

				switch mapping {
				default:
					continue
				case FAT:
					insertFood.Fat = float64(n.Value)
				case CARB:
					if n.Nutrient.Name == "Carbohydrate, by difference" && insertFood.Carb != 0 {
						continue // skip it, by summation is prefered
					}
					insertFood.Carb = float64(n.Value)
				case FIBRE:
					if n.Nutrient.Name == "Total dietary fiber (AOAC 2011.25)" && insertFood.Fibre != 0 {
						continue // skip it, I prefer the other fibre option
					}
					insertFood.Fibre = float64(n.Value)
				case PROTEIN:
					insertFood.Protein = float64(n.Value)
				}
			}
		}

		log.Debug().
			Str("name", food.Name).
			Int("fdcid", food.FDCID).
			Float64("fat", insertFood.Fat).
			Float64("carb", insertFood.Carb).
			Float64("fibre", insertFood.Fibre).
			Float64("protein", insertFood.Protein).
			Msg("importing food")

		if _, err := conn.AddDataSourceFood(ctx, &insertFood); err != nil {
			if ignoreErrors {
				log.Warn().
					Str("name", food.Name).
					Int("fdcid", food.FDCID).
					Float64("fat", insertFood.Fat).
					Float64("carb", insertFood.Carb).
					Float64("fibre", insertFood.Fibre).
					Float64("protein", insertFood.Protein).
					Msg("Failed to import food")
				continue
			}
			return err
		}
	}

	return nil
}
