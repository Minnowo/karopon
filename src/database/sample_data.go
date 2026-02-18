package database

import (
	"context"

	"github.com/pkg/errors"
	"github.com/rs/zerolog/log"
)

func CreateSampleData(ctx context.Context, db DB, username string) error {

	var user TblUser
	user.Name = username

	if err := db.LoadUser(ctx, user.Name, &user); err != nil {
		return errors.Wrap(err, "could not load user, they probably don't exist")
	}

	log.Info().Int("id", user.ID).Str("name", user.Name).Msg("test data user")

	event1 := TblUserEvent{UserID: user.ID, Name: "lunch"}

	if err := db.LoadUserEventByName(ctx, user.ID, "lunch", &event1); err != nil {

		if id, err := db.AddUserEvent(ctx, &event1); err != nil {
			return errors.Wrap(err, "failed to create user event")
		} else {
			event1.ID = id
		}
	}

	// userEvent1 := TblUserEventLog{
	// 	UserID:                   user.ID,
	// 	EventID:                  event1.ID,
	// 	UserTime:                 UnixMillis(time.Now()),
	// 	Event:                    event1.Name,
	// 	NetCarbs:                 0,
	// 	BloodGlucose:             0,
	// 	BloodGlucoseTarget:       0,
	// 	InsulinSensitivityFactor: 0,
	// 	InsulinToCarbRatio:       0,
	// 	RecommendedInsulinAmount: 0,
	// 	ActualInsulinTaken:       0,
	// }
	// if id, err := db.AddUserEventLog(ctx, &userEvent1); err != nil {
	// 	return err
	// } else {
	// 	userEvent1.ID = id
	// }
	food1 := TblUserFood{UserID: user.ID, Name: "tim bar", Portion: 1, Unit: "bar", Protein: 6, Carb: 22, Fibre: 4, Fat: 15}
	food1.Scale()

	if id, err := db.AddUserFood(ctx, &food1); err != nil {
		return errors.Wrap(err, "failed to add user food")
	} else {
		food1.ID = id
	}

	foods := []TblUserFood{
		{UserID: user.ID, Name: "english muffin - wonder", Portion: 57, Unit: "g", Protein: 5, Carb: 25, Fibre: 1, Fat: 1.5},
		{UserID: user.ID, Name: "spaghettini - great value", Portion: 85, Unit: "g", Protein: 12, Carb: 63, Fibre: 3, Fat: 1},
		{UserID: user.ID, Name: "egg - medium", Portion: 1, Unit: "egg", Protein: 5.5, Carb: 0.5, Fibre: 0, Fat: 4.5},
		{UserID: user.ID, Name: "whey - ON Gold Standard - Natural Vanilla", Portion: 32, Unit: "g", Protein: 24, Carb: 5, Fibre: 0, Fat: 1},
		{UserID: user.ID, Name: "cassein - ON Gold Standard - Natural Chocolate", Portion: 38, Unit: "g", Protein: 24, Carb: 8, Fibre: 1, Fat: 1.5},
		{UserID: user.ID, Name: "silk - oat yeah", Portion: 250, Unit: "ml", Protein: 1, Carb: 6, Fibre: 1, Fat: 2.5},
		{UserID: user.ID, Name: "oatmeal - quaker - large flake", Portion: 30, Unit: "g", Protein: 4, Carb: 20, Fibre: 3, Fat: 2},
		{UserID: user.ID, Name: "blueberries - frozen", Portion: 80, Unit: "g", Protein: 0.5, Carb: 10, Fibre: 2, Fat: 0},
		{UserID: user.ID, Name: "rice - jasmin", Portion: 50, Unit: "g", Protein: 4, Carb: 38, Fibre: 2, Fat: 0},
		{UserID: user.ID, Name: "sugar cube", Portion: 1, Unit: "cube", Protein: 0, Carb: 4, Fibre: 0, Fat: 0},
		{UserID: user.ID, Name: "fudge bar", Portion: 1, Unit: "bar", Protein: 2, Carb: 18, Fibre: 1, Fat: 2},
		{UserID: user.ID, Name: "float bar", Portion: 1, Unit: "bar", Protein: 0.2, Carb: 10, Fibre: 0, Fat: 2},
		{UserID: user.ID, Name: "english muffin - no name", Portion: 57, Unit: "g", Protein: 5, Carb: 26, Fibre: 1, Fat: 1},
		{UserID: user.ID, Name: "grapes", Portion: 100, Unit: "g", Protein: 0.72, Carb: 18.1, Fibre: 0.9, Fat: 0.16},
		{UserID: user.ID, Name: "french fries - no name", Portion: 85, Unit: "g", Protein: 2, Carb: 21, Fibre: 2, Fat: 3.5},
		{UserID: user.ID, Name: "cheesecake", Portion: 80, Unit: "g", Protein: 4, Carb: 32, Fibre: 1, Fat: 7},
		{UserID: user.ID, Name: "ice pop", Portion: 1, Unit: "pop", Protein: 0, Carb: 16, Fibre: 0, Fat: 0},
		{UserID: user.ID, Name: "hot dog bun - old mill", Portion: 1, Unit: "bun", Protein: 4, Carb: 21, Fibre: 1, Fat: 1.5},
		{UserID: user.ID, Name: "hot dog", Portion: 1, Unit: "dog", Protein: 4, Carb: 2, Fibre: 0, Fat: 10},
		{UserID: user.ID, Name: "teen burger and fries combo - A&W", Portion: 1, Unit: "combo", Protein: 25, Carb: 90, Fibre: 0, Fat: 0},
		{UserID: user.ID, Name: "egg - extra large", Portion: 1, Unit: "egg", Protein: 7, Carb: 1, Fibre: 0, Fat: 6},
		{UserID: user.ID, Name: "bagel - great value sesame", Portion: 75, Unit: "g", Protein: 8, Carb: 40, Fibre: 2, Fat: 1},
		{UserID: user.ID, Name: "sushi", Portion: 1, Unit: "piece", Protein: 0, Carb: 10, Fibre: 0, Fat: 0},
		{UserID: user.ID, Name: "pancake", Portion: 1, Unit: "cake", Protein: 0, Carb: 7.5, Fibre: 0, Fat: 0},
		{UserID: user.ID, Name: "collagen - Progressive Complete Collagen", Portion: 10, Unit: "g", Protein: 10, Carb: 0, Fibre: 0, Fat: 0},
		{UserID: user.ID, Name: "quiche", Portion: 1, Unit: "qtr", Protein: 0, Carb: 20, Fibre: 0, Fat: 0},
		{UserID: user.ID, Name: "ice cream - Haagen Dazs - Coffee", Portion: 125, Unit: "ml", Protein: 5, Carb: 22, Fibre: 0, Fat: 18},
		{UserID: user.ID, Name: "ice cream - Haagen Dazs - Green Tea", Portion: 125, Unit: "ml", Protein: 5, Carb: 21, Fibre: 0, Fat: 17},
		{UserID: user.ID, Name: "caramilk ice cream bar", Portion: 1, Unit: "bar", Protein: 2, Carb: 26, Fibre: 1, Fat: 12},
		{UserID: user.ID, Name: "pizza", Portion: 99, Unit: "g", Protein: 10, Carb: 29, Fibre: 1, Fat: 8},
		{UserID: user.ID, Name: "dim sum dumpling", Portion: 1, Unit: "dump", Protein: 1.5, Carb: 5, Fibre: 0, Fat: 1},
		{UserID: user.ID, Name: "hamburger bun - Dempsters", Portion: 50, Unit: "g", Protein: 4, Carb: 24, Fibre: 1, Fat: 2},
		{UserID: user.ID, Name: "lasagna", Portion: 227, Unit: "g", Protein: 15, Carb: 32, Fibre: 3, Fat: 12},
		{UserID: user.ID, Name: "fish - english style great value", Portion: 118, Unit: "g", Protein: 11, Carb: 19, Fibre: 0, Fat: 22},
		{UserID: user.ID, Name: "wings - Janes", Portion: 3, Unit: "wings", Protein: 17, Carb: 10, Fibre: 0, Fat: 16},
		{UserID: user.ID, Name: "hamburger bun - great value", Portion: 45, Unit: "g", Protein: 4, Carb: 23, Fibre: 1, Fat: 1.5},
		{UserID: user.ID, Name: "soup pork bun", Portion: 127, Unit: "g", Protein: 12, Carb: 27, Fibre: 4, Fat: 8},
		{UserID: user.ID, Name: "red bean", Portion: 50, Unit: "g", Protein: 10, Carb: 44, Fibre: 1, Fat: 3},
		{UserID: user.ID, Name: "chocolate oat milk", Portion: 250, Unit: "g", Protein: 3, Carb: 26, Fibre: 2, Fat: 0},
		{UserID: user.ID, Name: "garlic fingers - giuseppe", Portion: 79, Unit: "g", Protein: 7, Carb: 31, Fibre: 1, Fat: 14},
		{UserID: user.ID, Name: "whippet stick", Portion: 1, Unit: "stick", Protein: 0.5, Carb: 8, Fibre: 0.5, Fat: 3},
		{UserID: user.ID, Name: "yorkshire", Portion: 1, Unit: "g", Protein: 0, Carb: 8, Fibre: 0, Fat: 0},
		{UserID: user.ID, Name: "prodotti", Portion: 21, Unit: "g", Protein: 0.2, Carb: 20, Fibre: 0, Fat: 0},
		{UserID: user.ID, Name: "quaker harvest crunch", Portion: 45, Unit: "g", Protein: 5, Carb: 31, Fibre: 4, Fat: 8},
		{UserID: user.ID, Name: "flax bread", Portion: 60, Unit: "g", Protein: 6, Carb: 27, Fibre: 6, Fat: 4},
		{UserID: user.ID, Name: "hashbrown", Portion: 1, Unit: "patty", Protein: 1, Carb: 16, Fibre: 2, Fat: 8},
		{UserID: user.ID, Name: "potlicker", Portion: 84, Unit: "g", Protein: 6, Carb: 22, Fibre: 2, Fat: 3.5},
		{UserID: user.ID, Name: "rye", Portion: 26, Unit: "g", Protein: 2, Carb: 13, Fibre: 1, Fat: 0},
		{UserID: user.ID, Name: "pizza - ristorante", Portion: 81, Unit: "g", Protein: 8, Carb: 21, Fibre: 1, Fat: 11},
		{UserID: user.ID, Name: "watermelon", Portion: 154, Unit: "g", Protein: 0.9, Carb: 11.6, Fibre: 0.6, Fat: 0.2},
		{UserID: user.ID, Name: "ss cashew", Portion: 35, Unit: "g", Protein: 3, Carb: 23, Fibre: 1, Fat: 7},
		{UserID: user.ID, Name: "blackberries", Portion: 140, Unit: "g", Protein: 2, Carb: 22, Fibre: 7, Fat: 0},
		{UserID: user.ID, Name: "fried pork bun", Portion: 150, Unit: "g", Protein: 14, Carb: 38, Fibre: 5, Fat: 8},
		{UserID: user.ID, Name: "granola", Portion: 100, Unit: "g", Protein: 10, Carb: 68, Fibre: 8, Fat: 17},
		{UserID: user.ID, Name: "milk", Portion: 250, Unit: "ml", Protein: 9, Carb: 12, Fibre: 0, Fat: 5},
		{UserID: user.ID, Name: "boston cream", Portion: 81, Unit: "g", Protein: 5, Carb: 35, Fibre: 1, Fat: 6},
		{UserID: user.ID, Name: "bread stick", Portion: 45, Unit: "g", Protein: 4, Carb: 22, Fibre: 1, Fat: 2},
		{UserID: user.ID, Name: "egg nog", Portion: 125, Unit: "ml", Protein: 3, Carb: 21, Fibre: 0, Fat: 3},
		{UserID: user.ID, Name: "shreddies", Portion: 55, Unit: "g", Protein: 6, Carb: 45, Fibre: 6, Fat: 1},
		{UserID: user.ID, Name: "syrop", Portion: 45, Unit: "ml", Protein: 0, Carb: 44, Fibre: 0, Fat: 0},
		{UserID: user.ID, Name: "cocao", Portion: 40, Unit: "g", Protein: 11, Carb: 21, Fibre: 13, Fat: 4.5},
		{UserID: user.ID, Name: "peameal bacon", Portion: 100, Unit: "g", Protein: 17, Carb: 2, Fibre: 0, Fat: 3},
		{UserID: user.ID, Name: "tortia", Portion: 61, Unit: "g", Protein: 6, Carb: 30, Fibre: 4, Fat: 4.5},
		{UserID: user.ID, Name: "rhoubarb pie", Portion: 100, Unit: "g", Protein: 0, Carb: 30, Fibre: 0, Fat: 0},
		{UserID: user.ID, Name: "vermicelli", Portion: 50, Unit: "g", Protein: 3, Carb: 41, Fibre: 1, Fat: 0},
		{UserID: user.ID, Name: "ice cream - irresistables dutch chocolate", Portion: 188, Unit: "g", Protein: 2, Carb: 32, Fibre: 1, Fat: 9},
		{UserID: user.ID, Name: "limoncello", Portion: 100, Unit: "g", Protein: 4, Carb: 32, Fibre: 2, Fat: 5},
		{UserID: user.ID, Name: "apple pie", Portion: 100, Unit: "g", Protein: 2.4, Carb: 37.1, Fibre: 2, Fat: 12.5},
		{UserID: user.ID, Name: "perogies", Portion: 90, Unit: "g", Protein: 5, Carb: 31, Fibre: 1, Fat: 1.5},
		{UserID: user.ID, Name: "chile", Portion: 100, Unit: "g", Protein: 8.7, Carb: 12.36, Fibre: 4, Fat: 0.6},
		{UserID: user.ID, Name: "chocolate cake", Portion: 43, Unit: "g", Protein: 2, Carb: 35, Fibre: 1, Fat: 1},
		{UserID: user.ID, Name: "hot chocolate - tim hotons", Portion: 48, Unit: "g", Protein: 2, Carb: 41, Fibre: 1, Fat: 2.5},
		{UserID: user.ID, Name: "banana bread", Portion: 50, Unit: "g", Protein: 4, Carb: 35, Fibre: 2, Fat: 5},
		{UserID: user.ID, Name: "ravioli", Portion: 215, Unit: "g", Protein: 20, Carb: 64, Fibre: 4, Fat: 5},
		{UserID: user.ID, Name: "potsticker", Portion: 92, Unit: "g", Protein: 7, Carb: 22, Fibre: 6, Fat: 2},
		{UserID: user.ID, Name: "rav2", Portion: 150, Unit: "g", Protein: 17, Carb: 74, Fibre: 4, Fat: 10},
		{UserID: user.ID, Name: "chicken soup", Portion: 250, Unit: "cup", Protein: 2, Carb: 13, Fibre: 1, Fat: 0.5},
		{UserID: user.ID, Name: "tomato soup", Portion: 125, Unit: "g", Protein: 2, Carb: 20, Fibre: 1, Fat: 0},
		{UserID: user.ID, Name: "steamed roll", Portion: 30, Unit: "g", Protein: 3, Carb: 25, Fibre: 0, Fat: 1},
		{UserID: user.ID, Name: "sp", Portion: 175, Unit: "g", Protein: 19, Carb: 7, Fibre: 0, Fat: 3.5},
		{UserID: user.ID, Name: "chicken", Portion: 100, Unit: "g", Protein: 27, Carb: 0, Fibre: 0, Fat: 0},
		{UserID: user.ID, Name: "sv", Portion: 175, Unit: "g", Protein: 17, Carb: 15, Fibre: 0, Fat: 3},
		{UserID: user.ID, Name: "nw - naked whey", Portion: 37, Unit: "g", Protein: 25, Carb: 8, Fibre: 0, Fat: 2},
		{UserID: user.ID, Name: "nc - naked casein", Portion: 37, Unit: "g", Protein: 26, Carb: 6, Fibre: 0, Fat: 0},
		{UserID: user.ID, Name: "corn", Portion: 100, Unit: "g", Protein: 3.1, Carb: 22, Fibre: 2, Fat: 1.4},
		{UserID: user.ID, Name: "ice cream - lemon twist", Portion: 188, Unit: "g", Protein: 2, Carb: 29, Fibre: 0, Fat: 8},
		{UserID: user.ID, Name: "almonds", Portion: 50, Unit: "g", Protein: 10, Carb: 10, Fibre: 6, Fat: 25},
		{UserID: user.ID, Name: "dates", Portion: 40, Unit: "g", Protein: 1, Carb: 32, Fibre: 4, Fat: 0},
		{UserID: user.ID, Name: "sy", Portion: 175, Unit: "g", Protein: 10, Carb: 9, Fibre: 0, Fat: 9},
		{UserID: user.ID, Name: "golden shreddies", Portion: 57, Unit: "g", Protein: 5, Carb: 48, Fibre: 6, Fat: 1},
		{UserID: user.ID, Name: "lara bar", Portion: 1, Unit: "bar", Protein: 6, Carb: 24, Fibre: 4, Fat: 12},
		{UserID: user.ID, Name: "pear - raw", Portion: 100, Unit: "g", Protein: 0.36, Carb: 15.23, Fibre: 3.1, Fat: 0.14},
		{UserID: user.ID, Name: "sweet potato - baked with skin", Portion: 100, Unit: "g", Protein: 2.01, Carb: 20.71, Fibre: 3.3, Fat: 0.15},
		{UserID: user.ID, Name: "potato - red - baked - with skin", Portion: 100, Unit: "g", Protein: 2.3, Carb: 19.59, Fibre: 1.8, Fat: 0.15},
		{UserID: user.ID, Name: "rye bread", Portion: 100, Unit: "g", Protein: 8.5, Carb: 48.3, Fibre: 5.8, Fat: 3.3},
		{UserID: user.ID, Name: "applesauce - motts", Portion: 100, Unit: "g", Protein: 0, Carb: 22.6, Fibre: 1.8, Fat: 0},
		{UserID: user.ID, Name: "hamburger - lean ground", Portion: 100, Unit: "g", Protein: 25.54, Carb: 0, Fibre: 0, Fat: 16.82},
		{UserID: user.ID, Name: "salmon", Portion: 100, Unit: "g", Protein: 25.78, Carb: 0, Fibre: 0, Fat: 5.53},
		{UserID: user.ID, Name: "bean - red kidney - canned - drained", Portion: 100, Unit: "g", Protein: 8.7, Carb: 24.72, Fibre: 8, Fat: 0.6},
		{UserID: user.ID, Name: "apple - raw - with skin", Portion: 100, Unit: "g", Protein: 0.26, Carb: 13.81, Fibre: 2.4, Fat: 0.17},
		{UserID: user.ID, Name: "banana - raw", Portion: 100, Unit: "g", Protein: 1.09, Carb: 22.84, Fibre: 2.6, Fat: 0.33},
		{UserID: user.ID, Name: "nectarine - raw", Portion: 100, Unit: "g", Protein: 1.06, Carb: 10.55, Fibre: 1.7, Fat: 0.32},
		{UserID: user.ID, Name: "peach - raw", Portion: 100, Unit: "g", Protein: 0.91, Carb: 9.54, Fibre: 1.5, Fat: 0.25},
		{UserID: user.ID, Name: "plum - raw", Portion: 100, Unit: "g", Protein: 0.7, Carb: 11.42, Fibre: 1.4, Fat: 0.28},
		{UserID: user.ID, Name: "carrot - raw", Portion: 100, Unit: "g", Protein: 0.93, Carb: 9.58, Fibre: 2.8, Fat: 0.24},
		{UserID: user.ID, Name: "apricot -raw", Portion: 100, Unit: "g", Protein: 1.4, Carb: 11.12, Fibre: 2, Fat: 0.39},
	}

	for _, food := range foods {
		food.Scale()
	}
	err := db.AddUserFoods(context.Background(), foods)

	if err != nil {
		return err
	}

	return err
}
